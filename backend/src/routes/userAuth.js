const express = require('express');
const authRouter = express.Router();
const { register, login, logout, adminRegister, deleteProfile } = require('../controllers/userAuthent');
const authMiddleware = require("../middleware/authMiddleware");

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', authMiddleware(), logout);
authRouter.post('/admin/register', authMiddleware('admin'), adminRegister);
authRouter.delete('/deleteProfile', authMiddleware(), deleteProfile);

authRouter.get('/check', authMiddleware(), (req, res) => {
    res.status(200).json({
        user: {
            firstName: req.result.firstName,
            emailId:   req.result.emailId,
            _id:       req.result._id,
            role:      req.result.role,
        },
        message: "Valid user",
    });
});

// Used by Socket.io on the frontend — httpOnly cookies can't be read by JS
// so this endpoint echoes the token back so the socket can auth with it
authRouter.get('/get-token', authMiddleware(), (req, res) => {
    res.json({ token: req.cookies.token });
});

module.exports = authRouter;