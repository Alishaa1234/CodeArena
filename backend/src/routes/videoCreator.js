const express = require('express');
const videoRouter = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { generateUploadSignature, saveVideoMetadata, deleteVideo } = require("../controllers/videoSection");

videoRouter.get("/create/:problemId", authMiddleware('admin'), generateUploadSignature);
videoRouter.post("/save", authMiddleware('admin'), saveVideoMetadata);
videoRouter.delete("/delete/:problemId", authMiddleware('admin'), deleteVideo);

module.exports = videoRouter;
