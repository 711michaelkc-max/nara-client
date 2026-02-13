
const http = require('http');
const fs = require('fs');

const data = JSON.stringify({
    url: 'https://example.com/test.pdf'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/parse-attachment',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let output = `STATUS: ${res.statusCode}\nHEADERS: ${JSON.stringify(res.headers)}\n`;
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        output += `BODY: ${chunk}\n`;
    });
    res.on('end', () => {
        output += 'No more data in response.\n';
        fs.writeFileSync('api_test_result.txt', output);
    });
});

req.on('error', (e) => {
    fs.writeFileSync('api_test_result.txt', `ERROR: ${e.message}`);
});

req.write(data);
req.end();
