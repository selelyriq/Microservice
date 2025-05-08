const express = require("express");
const mongodb = require("mongodb");

function setupHandlers(app, db) {
    const videosCollection = db.collection("videos");
    app.post("/viewed", (req, res) => {
        const videoPath = req.body.videoPath;
        videosCollection.insertOne({ videoPath: videoPath })
            .then(() => {
                console.log(`Added video ${videoPath} to history`);
                res.sendStatus(200);
            })
            .catch(err => {
                console.error(`Error adding video ${videoPath} to history.`);
                console.error(err && err.stack || err);
                res.sendStatus(500);
            });
    });
}

function startHttpServer(db) {
    return new Promise(resolve => {
        const app = express();
        app.use(express.json());
        setupHandlers(app, db);

        const port = process.env.PORT && parseInt(process.env.PORT) || 3000;
        app.listen(port, () => {
            console.log(`Server is listening on port ${port}`);
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

function setHandlers(app, db, messageChannel) {
    const videosCollection = db.collection("videos");
    
    function consumeViewedMessage(msg) {
        const parsedMsg = JSON.parse(msg.content.toString());

        return videosCollection.insertOne({ videoPath: parsedMsg.videoPath })
            .then(() => {
                messageChannel.ack(msg);
            });
    }
    
    return messageChannel.assertQueue("viewed", {})
        .then(() => {
            return messageChannel.consume("viewed", consumeViewedMessage);
        })
        .catch(err => {
            console.error("Error setting up message channel.");
            console.error(err && err.stack || err);
            process.exit(1);
        });
}

main()
    .then(() => console.log("Microservice online."))
    .catch(err => {
        console.error("Microservice failed to start.");
        console.error(err && err.stack || err);
    });