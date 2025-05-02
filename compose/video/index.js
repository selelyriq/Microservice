const express = require('express');
const http = require('http');
const fs = require('fs');
const app = express();
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);

console.log('Environment variables:');
console.log('VIDEO_STORAGE_HOST:', VIDEO_STORAGE_HOST);
console.log('VIDEO_STORAGE_PORT:', VIDEO_STORAGE_PORT);
console.log('PORT:', process.env.PORT);

if (process.env.PORT === undefined) {
    throw new Error('PORT is not set, please set it in the environment variables');
}
const port = process.env.PORT;

app.get('/', (req, res) => {
    res.send('Welcome to the video server!');
});

app.get('/video', (req,res) => {
    console.log('Received video request');
    const forwardPath = `/video?videopath=reel.m4v`;
    const targetUrl = `http://${VIDEO_STORAGE_HOST}:${VIDEO_STORAGE_PORT}${forwardPath}`;
    console.log('Forwarding to:', targetUrl);
    
    const forwardRequest = http.request({
        host: VIDEO_STORAGE_HOST,
        port: VIDEO_STORAGE_PORT,
        path: forwardPath,
        method: 'GET',
        headers: req.headers,
        timeout: 5000 // 5 second timeout
    }, (forwardResponse) => {
        console.log('Received response from storage service:', forwardResponse.statusCode);
        console.log('Response headers:', forwardResponse.headers);
        res.writeHead(forwardResponse.statusCode, forwardResponse.headers);
        forwardResponse.pipe(res);
    });

    forwardRequest.on('error', (error) => {
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        res.status(500).send(`Error forwarding request to storage service: ${error.message}`);
    });

    forwardRequest.on('timeout', () => {
        console.error('Request timeout');
        forwardRequest.destroy();
        res.status(504).send('Storage service timeout');
    });

    forwardRequest.end();
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
