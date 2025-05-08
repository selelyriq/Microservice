const express = require('express');
const http = require('http');
const mongodb = require('mongodb');
const fs = require('fs');
const app = express();
const VIDEO_STORAGE_HOST = process.env.VIDEO_STORAGE_HOST;
const VIDEO_STORAGE_PORT = parseInt(process.env.VIDEO_STORAGE_PORT);
const DBHOST = process.env.DBHOST;
const DBNAME = process.env.DBNAME;

let videosCollection;

function main() {
    return mongodb.MongoClient.connect(DBHOST)
        .then(client => {
            const db = client.db(DBNAME);
            videosCollection = db.collection('videos');
            return videosCollection;
        });
}

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

app.get('/video', (req, res) => {
    if (req.query.videoID) {
        const videoID = new mongodb.ObjectId(req.query.videoID);
        videosCollection.findOne({_id: videoID})
            .then(videoRecord => {
                if (!videoRecord) {
                    res.status(404).send('Video not found');
                    return;
                }
                
                const path = `/video?path=${videoRecord.videoPath}`;
                console.log('Forwarding to:', `http://${VIDEO_STORAGE_HOST}:${VIDEO_STORAGE_PORT}${path}`);
                
                const forwardRequest = http.request({
                    host: VIDEO_STORAGE_HOST,
                    port: VIDEO_STORAGE_PORT,
                    path: path,
                    method: 'GET',
                    headers: req.headers,
                    timeout: 5000 // 5 second timeout
                }, forwardResponse => {
                    if (!res.headersSent) {
                        res.writeHead(forwardResponse.statusCode, forwardResponse.headers);
                        forwardResponse.pipe(res);
                    }
                });
                
                forwardRequest.on('error', (error) => {
                    console.error('Error details:', {
                        code: error.code,
                        message: error.message,
                        stack: error.stack
                    });
                    if (!res.headersSent) {
                        res.status(500).send(`Error forwarding request to storage service: ${error.message}`);
                    }
                });
                
                forwardRequest.on('timeout', () => {
                    console.error('Request timeout');
                    forwardRequest.destroy();
                    if (!res.headersSent) {
                        res.status(504).send('Storage service timeout');
                    }
                });
                
                forwardRequest.end();
            })
            .catch(err => {
                console.error("Database query failed.");
                console.error(err && err.stack || err);
                if (!res.headersSent) {
                    res.status(500).send('Internal server error');
                }
            });
    } else {
        // Fallback to direct video playback
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
            if (!res.headersSent) {
                res.writeHead(forwardResponse.statusCode, forwardResponse.headers);
                forwardResponse.pipe(res);
            }
        });

        forwardRequest.on('error', (error) => {
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            if (!res.headersSent) {
                res.status(500).send(`Error forwarding request to storage service: ${error.message}`);
            }
        });

        forwardRequest.on('timeout', () => {
            console.error('Request timeout');
            forwardRequest.destroy();
            if (!res.headersSent) {
                res.status(504).send('Storage service timeout');
            }
        });

        forwardRequest.end();
    }
});

function sendViewedMessage(videoPath) {
    const postOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
    };
    const requestBody = {
        videoPath: videoPath,
    };
    const req = http.request(
        "http://history/viewed",
        postOptions
    );
    req.on("close", () => {
        console.log("Viewed message sent");
    });
    req.on("error", (err) => {
        console.error("Error sending viewed message:", err);
    });
    req.write(JSON.stringify(requestBody));
    req.end();
}

// Start the server only after connecting to MongoDB
main()
    .then(() => {
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            console.log("Microservice online.");
        });
    })
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
        process.exit(1);
    });