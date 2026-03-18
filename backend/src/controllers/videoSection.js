const cloudinary = require('cloudinary').v2;
const Problem = require("../models/problem");
const SolutionVideo = require("../models/solutionVideo");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const generateUploadSignature = async (req, res, next) => {
    try {
        const { problemId } = req.params;
        const userId = req.result._id;

        const problem = await Problem.findById(problemId);
        if (!problem)
            return res.status(404).json({ message: "Problem not found" });

        const timestamp = Math.round(Date.now() / 1000);
        const publicId = `leetcode-solutions/${problemId}/${userId}_${timestamp}`;

        const signature = cloudinary.utils.api_sign_request(
            { timestamp, public_id: publicId },
            process.env.CLOUDINARY_API_SECRET
        );

        // Note: api_key is needed by the client to complete the upload, but
        // it is the *upload* key (not the secret). It is safe to send.
        res.json({
            signature,
            timestamp,
            public_id: publicId,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
        });
    } catch (err) {
        next(err);
    }
};

const saveVideoMetadata = async (req, res, next) => {
    try {
        const { problemId, cloudinaryPublicId, secureUrl, duration } = req.body;
        const userId = req.result._id;

        const cloudinaryResource = await cloudinary.api.resource(
            cloudinaryPublicId,
            { resource_type: 'video' }
        );

        if (!cloudinaryResource)
            return res.status(400).json({ message: "Video not found on Cloudinary" });

        const existingVideo = await SolutionVideo.findOne({ problemId, userId, cloudinaryPublicId });
        if (existingVideo)
            return res.status(409).json({ message: "Video already exists" });

        // Generate a proper thumbnail URL via Cloudinary transformation
        const thumbnailUrl = cloudinary.url(cloudinaryResource.public_id, {
            resource_type: 'video',
            transformation: [
                { width: 400, height: 225, crop: 'fill' },
                { quality: 'auto' },
                { start_offset: '2' },
            ],
            format: 'jpg',
        });

        const videoSolution = await SolutionVideo.create({
            problemId,
            userId,
            cloudinaryPublicId,
            secureUrl,
            duration: cloudinaryResource.duration || duration,
            thumbnailUrl,
        });

        res.status(201).json({
            message: "Video solution saved successfully",
            videoSolution: {
                id: videoSolution._id,
                thumbnailUrl: videoSolution.thumbnailUrl,
                duration: videoSolution.duration,
                uploadedAt: videoSolution.createdAt,
            },
        });
    } catch (err) {
        next(err);
    }
};

const deleteVideo = async (req, res, next) => {
    try {
        const { problemId } = req.params;
        const userId = req.result._id;

        // Fixed: include userId to ensure ownership check
        const video = await SolutionVideo.findOneAndDelete({ problemId, userId });
        if (!video)
            return res.status(404).json({ message: "Video not found" });

        await cloudinary.uploader.destroy(video.cloudinaryPublicId, {
            resource_type: 'video',
            invalidate: true,
        });

        res.status(200).json({ message: "Video deleted successfully" });
    } catch (err) {
        next(err);
    }
};

module.exports = { generateUploadSignature, saveVideoMetadata, deleteVideo };
