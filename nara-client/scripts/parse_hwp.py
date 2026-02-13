
import sys
import zlib
import struct

def extract_hwp_text(file_path):
    # 1. Try HWPX (Zip-based)
    try:
        import zipfile
        if zipfile.is_zipfile(file_path):
            text = ""
            with zipfile.ZipFile(file_path, 'r') as zf:
                # HWPX stores text in Contents/sectionX.xml
                # Filter for section files
                section_files = [f for f in zf.namelist() if f.startswith('Contents/section') and f.endswith('.xml')]
                section_files.sort() # Ensure order
                
                for section in section_files:
                    xml_data = zf.read(section).decode('utf-8')
                    # HWPX Paragraphs end with </hp:p>
                    # We insert a newline there to ensure line separation
                    xml_data = xml_data.replace('</hp:p>', '\n')
                    
                    # Simple XML tag stripping
                    import re
                    # Replace remaining tags with empty string or space. 
                    # check if we should likely format runs <hp:t> separately? 
                    # usually <hp:t>text</hp:t>. 
                    # Just stripping all tags after inserting \n is a good heuristic.
                    clean_text = re.sub(r'<[^>]+>', '', xml_data) 
                    text += clean_text + "\n"
            
            # Post-processing: Collapse multiple spaces BUT PRESERVE NEWLINES
            import re
            # Replace multiple spaces/tabs with single space
            text = re.sub(r'[ \t]+', ' ', text)
            # Collapse multiple newlines to max 2
            text = re.sub(r'\n\s*\n', '\n\n', text)
            return text.strip()
    except Exception as e:
        pass # Not a zip or failed, fall back to OLE

    # 2. Try HWP (OLE-based)
    try:
        import olefile
    except ImportError:
        return "ERROR: 'olefile' library not found. Please run 'pip install olefile'"

    try:
        f = olefile.OleFileIO(file_path)
        dirs = f.listdir()

        # Check for HWP 5.0 signature
        if ["FileHeader"] not in dirs and ["\x05HwpSummaryInformation"] not in dirs:
             return "ERROR: Not a valid HWP file (nor HWPX)"

        # Read BodyText/SectionX
        sections = [d for d in dirs if d[0] == "BodyText"]
        text = ""

        for section in sections:
            stream = f.openstream(section)
            data = stream.read()
            
            # Decompress if needed (HWP 5.0 streams are usually zlib compressed)
            try:
                unpacked_data = zlib.decompress(data, -15)
            except:
                unpacked_data = data
            
            # Extract readable text (simple extraction of utf-16le strings might work, 
            # but HWP structure is complex. We'll try a basic unicode extraction for now 
            # or rely on the fact that text is often contiguous)
            
            # Very basic extraction logic for HWP 5.0 text records
            # Real parsing requires parsing the HWP record structure (Tag ID, Size, etc.)
            # For this MVP, we will attempt to decode purely as UTF-16LE and filter valid chars
            # This is "dirty" but often works for finding Keywords like "국가", "인원".
            
            try:
                # HWP text is UTF-16LE
                decoded = unpacked_data.decode('utf-16le', errors='ignore')
                text += decoded
            except:
                pass

        f.close()
        
        # Post-processing for OLE text (Same as HWPX)
        import re
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        return text.strip()

    except Exception as e:
        return f"ERROR: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python parse_hwp.py <file_path>")
        sys.exit(1)

    file_path = sys.argv[1]
    result = extract_hwp_text(file_path)
    # Output properly encoded for Node.js to capture
    sys.stdout.buffer.write(result.encode('utf-8'))
