const express = require('express');
const http = require('http');
const fs = require('fs');
const app = express();
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
if (process.env.PORT === undefined) {
    throw new Error('PORT is not set, please set it in the environment variables');
}
const port = process.env.PORT;

app.get('/', (req, res) => {
    res.send('Welcome to the video server!');
});

app.get('/video', (req,res) => {
    const forwardRequest = http.request({
        host: VIDEO_STORAGE_HOST,
        port: VIDEO_STORAGE_PORT,
        path: 'video?videopath=reel.m4v',
        method: 'GET',
        headers: req.headers,
    }, (response) => {
        response.pipe(res);
    });

    forwardResponse => {
        res.writeHeader(forwardResponse.statusCode, forwardResponse.headers);
        forwardResponse.pipe(res);
    }
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
