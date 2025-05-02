const express = require('express');
const fs = require('fs');
const app = express();
if (process.env.PORT === undefined) {
    throw new Error('PORT is not set, please set it in the environment variables');
}
const port = process.env.PORT;

app.get('/', (req, res) => {
    res.send('Welcome to the video server!');
});

app.get('/video', (req,res) => {
    const path =
    "/Users/lyriqsele/Desktop/reel.m4v";
    fs.stat(path, (err, stats) => {
        if (err) {
            return res.status(500).send('Video not found');
        }
        res.writeHead(200, {
            'Content-Length': stats.size,
            'Content-Type': 'video/mp4',
        });
        fs.createReadStream(path).pipe(res);
    })
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
