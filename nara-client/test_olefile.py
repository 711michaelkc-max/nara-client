
try:
    import olefile
    print("SUCCESS: olefile imported")
except ImportError:
    print("FAILURE: olefile not found")
