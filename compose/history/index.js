const express = require("express");
const mongodb = require("mongodb");

function setupHandlers(app, db) {
    const videosCollection = db.collection("videos");
    app.post("/viewed", (req, res) => {
        const videoPath = req.body.videoPath;
        videosCollection.insertOne({ videoPath: videoPath })
            .then(() => {
                console.log('Added video ${videoPath} to history');
                res.sendStatus(200);
            })
            .catch(err => {
                console.error('Error adding video ${videoPath} to history.');
                console.error(err && err.stack || err);
                res.sendStatus(500);
            });
    });
}

// function setupHandlers(app, db) {
//     const videosCollection = db.collection("videos");
    
//     app.get('/', (req, res) => {
//         res.send('Welcome to my codebase!');
//     });

//     app.get('/history', (req, res) => {
//         res.json({ message: 'History endpoint' });
//     });

//     app.post("/viewed", (req, res) => {
//         const videoPath = req.body.videoPath;
//         videosCollection.insertOne({ videoPath: videoPath })
//             .then(() => {
//                 res.sendStatus(200);
//             })
//             .catch(err => {
//                 console.error("Error inserting video path:", err);
//                 res.sendStatus(500);
//             });
//     });
// }

function startHttpServer(db) {
    return new Promise(resolve => {
        const app = express();
        app.use(express.json());
        setupHandlers(app, db);

        const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
        app.listen(port, () => {
            resolve();
        });
    });
}

function main() {
    return mongodb.MongoClient.connect("mongodb://db:27017")
        .then(client => {
            const db = client.db("history");
            return startHttpServer(db);
        });
}

main().then(() => console.log("Microservice online."))
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });