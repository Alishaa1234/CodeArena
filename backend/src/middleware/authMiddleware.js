const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { safeExists } = require("../config/redis");

const authMiddleware = (requiredRole = "user") => {
    return async (req, res, next) => {
        try {
            let token = req.cookies.token;
            if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
                token = req.headers.authorization.split(" ")[1];
            }
            if (!token)
                throw new Error("Token is not present");

            const payload = jwt.verify(token, process.env.JWT_KEY);
            const { _id } = payload;

            if (!_id)
                throw new Error("Invalid token");

            const result = await User.findById(_id);
            if (!result)
                throw new Error("User doesn't exist");

            // Check Redis blocklist — degrades gracefully if Redis is down
            const isBlocked = await safeExists(`token:${token}`);
            if (isBlocked)
                throw new Error("Invalid token");

            if (requiredRole === "admin" && result.role !== "admin")
                throw new Error("Access denied: admins only");

            req.result = result;
            next();
        } catch (err) {
            res.status(401).json({ message: err.message });
        }
    };
};

module.exports = authMiddleware;
