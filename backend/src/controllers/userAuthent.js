const { safeSet, safeExpireAt } = require("../config/redis");
const User = require("../models/user");
const validate = require('../utils/validator');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000
};

const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
};

const buildUserReply = (user) => ({
    firstName: user.firstName,
    lastName: user.lastName,
    emailId: user.emailId,
    _id: user._id,
    role: user.role,
    avatarUrl: user.avatarUrl,
});

const register = async (req, res, next) => {
    try {
        validate(req.body);
        const { emailId, password } = req.body;

        req.body.password = await bcrypt.hash(password, 10);
        req.body.role = 'user';

        const user = await User.create(req.body);
        const token = jwt.sign(
            { _id: user._id, emailId, role: user.role },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, COOKIE_OPTIONS);
        res.status(201).json({ user: buildUserReply(user), token, message: "Registered successfully" });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { emailId, password } = req.body;

        if (!emailId || !password)
            throw new Error("Invalid credentials");

        const user = await User.findOne({ emailId });
        if (!user)
            throw new Error("Invalid credentials");

        const match = await bcrypt.compare(password, user.password);
        if (!match)
            throw new Error("Invalid credentials");

        const token = jwt.sign(
            { _id: user._id, emailId, role: user.role },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, COOKIE_OPTIONS);
        res.status(200).json({ user: buildUserReply(user), token, message: "Logged in successfully" });
    } catch (err) {
        next(err);
    }
};

const logout = async (req, res, next) => {
    try {
        const { token } = req.cookies;
        if (token) {
            const payload = jwt.decode(token);
            // Blocklist token in Redis (silently skipped if Redis is down)
            await safeSet(`token:${token}`, 'Blocked');
            await safeExpireAt(`token:${token}`, payload.exp);
        }
        res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        next(err);
    }
};

// Only existing admins can create new admins (enforced by authMiddleware('admin') in the route)
const adminRegister = async (req, res, next) => {
    try {
        validate(req.body);
        const { emailId, password } = req.body;

        req.body.password = await bcrypt.hash(password, 10);
        req.body.role = 'admin';

        const user = await User.create(req.body);
        const token = jwt.sign(
            { _id: user._id, emailId, role: user.role },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, COOKIE_OPTIONS);
        res.status(201).json({ token, message: "Admin registered successfully" });
    } catch (err) {
        next(err);
    }
};

const deleteProfile = async (req, res, next) => {
    try {
        const userId = req.result._id;
        await User.findByIdAndDelete(userId);
        res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
        res.status(200).json({ message: "Profile deleted successfully" });
    } catch (err) {
        next(err);
    }
};

const googleLogin = async (req, res, next) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: "Google credential token is required" });
        }

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email: emailId, given_name: firstName, family_name: lastName, picture: avatarUrl } = payload;

        // Process names to satisfy schema validation constraints (firstName and lastName require minLength: 3 if present)
        let fName = firstName || "Google User";
        let lName = lastName || "";

        if (fName.trim().length < 3) {
            fName = fName.trim().padEnd(3, "_");
        }
        if (lName && lName.trim().length < 3) {
            if ((fName + " " + lName).length <= 20) {
                fName = fName + " " + lName;
            }
            lName = "";
        }

        // Account linking: Check if user exists
        let user = await User.findOne({ googleId });

        if (!user) {
            // Check if user exists with matching email
            user = await User.findOne({ emailId });
            if (user) {
                // Link Google account to existing user
                user.googleId = googleId;
                if (!user.avatarUrl && avatarUrl) {
                    user.avatarUrl = avatarUrl;
                }
                await user.save();
            } else {
                // Create a new user
                user = await User.create({
                    firstName: fName,
                    lastName: lName || undefined,
                    emailId,
                    googleId,
                    avatarUrl,
                    role: 'user'
                });
            }
        } else {
            // Update avatar URL if it changed/updated
            if (avatarUrl && user.avatarUrl !== avatarUrl) {
                user.avatarUrl = avatarUrl;
                await user.save();
            }
        }

        const token = jwt.sign(
            { _id: user._id, emailId: user.emailId, role: user.role },
            process.env.JWT_KEY,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, COOKIE_OPTIONS);
        res.status(200).json({ user: buildUserReply(user), token, message: "Logged in with Google successfully" });
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, logout, adminRegister, deleteProfile, googleLogin };