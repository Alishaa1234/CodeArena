const { safeSet, safeExpireAt } = require("../config/redis");
const User = require("../models/user");
const validate = require('../utils/validator');
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken');

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000
};

const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
};

const buildUserReply = (user) => ({
    firstName: user.firstName,
    emailId: user.emailId,
    _id: user._id,
    role: user.role,
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
        res.status(201).json({ user: buildUserReply(user), message: "Registered successfully" });
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
        res.status(200).json({ user: buildUserReply(user), message: "Logged in successfully" });
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
        res.status(201).json({ message: "Admin registered successfully" });
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

module.exports = { register, login, logout, adminRegister, deleteProfile };