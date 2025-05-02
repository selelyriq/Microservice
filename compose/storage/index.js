const express = require('express');
const azure = require('azure-storage');
const app = express();
const port = process.env.PORT;
const STORAGE_ACCOUNT_NAME = 
    process.env.STORAGE_ACCOUNT_NAME;
const STORAGE_ACCESS_KEY = 
    process.env.STORAGE_ACCESS_KEY;

function createBlobService() {
    const blobService = azure.createBlobService( 
        STORAGE_ACCOUNT_NAME, STORAGE_ACCESS_KEY);
    return blobService;
}

app.get('/video', (req, res) => {
    const videopath = req.query.videopath;
    
    if (!videopath) {
        return res.status(400).send('Video path parameter is required');
    }

    const blobService = createBlobService();
    const containerName = 'videos';
    
    blobService.getBlobProperties(containerName, videopath, (error, result) => {
        if (error) {
            console.error('Error fetching blob properties:', error);
            return res.status(500).send('Error fetching video');
        }

        // Set default content type for video files
        const contentType = result.contentType || 'video/mp4';
        
        res.writeHead(200, {
            'Content-Length': result.contentLength,
            'Content-Type': contentType
        });

        blobService.getBlobToStream(containerName, videopath, res, error => {
            if (error) {
                console.error('Error streaming video:', error);
                if (!res.headersSent) {
                    res.status(500).send('Error streaming video');
                }
            }
        });
    });
});

app.listen(port, () => {
    console.log(`Microservice is Online on port ${port}`);
});