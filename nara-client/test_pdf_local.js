
// Polyfill checks
if (typeof Promise.withResolvers === 'undefined') {
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}

if (typeof global.DOMMatrix === 'undefined') {
    global.DOMMatrix = class DOMMatrix {
        constructor() {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
        translate() { return this; }
        scale() { return this; }
        rotate() { return this; }
        multiply() { return this; }
        transformPoint(p) { return p; }
    };
}

const pdf = require('pdf-parse/lib/pdf-parse.js');
const fs = require('fs');

console.log('Type of pdf:', typeof pdf);
console.log('Structure of pdf:', pdf);

// Create a dummy PDF buffer (minimal valid PDF structure if possible, or just try to parse a text file to see if it explodes, but pdf-parse needs real PDF)
// Since I don't have a real PDF, I'll try to download one or use a very minimal PDF hex string.
// Minimal PDF:
const minimalPdf = `%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000117 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
223
%%EOF`;

const buffer = Buffer.from(minimalPdf);

console.log("Starting PDF Parse Test...");

console.log("Starting PDF Parse Test (Standard v1.1.1)...");

// Standard usage for pdf-parse 1.1.1
pdf(buffer).then(data => {
    console.log("SUCCESS");
    console.log("Text:", data.text);
}).catch(err => {
    console.error("FAILURE");
    console.error(err);
});
