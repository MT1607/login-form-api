const jwt = require('jsonwebtoken');
const client = require("../db");
const {loadFileSQL} = require("../utils/script");
const { promisify } = require("util");

const requireAuth = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ message: "User isn't logged in" });
        }

        const decodeToken = await promisify(jwt.verify)(token, "MT1607");
        if (!decodeToken) {
            return res.status(500).json({ message: "Token user is not decoded" });
        }

        req.user = decodeToken; // Lưu user vào request để dùng sau này
        next();
    } catch (error) {
        return res.status(500).json({ message: "Authentication failed", error: error.message });
    }
};

const checkUser = async (req, res, next) => {
    const token = req.cookies.jwt;
    try {
        if (!token) {
            return res.status(402).json({message: "User not logging"});
        }
        const decodeToken = await promisify(jwt.verify)(token, "MT1607");
        if (!decodeToken) {
            return res.status(500).json({message: "Token user is not decoded"});
        }
        const userId = decodeToken.userId;
        const query = loadFileSQL("getUserById.sql");
        const user = await client.query(query, [userId]);
        return  res.status(200).json({message: "Found user", user: user.rows[0]});
    } catch (e) {
        return res.status(500).json({message: "Server error"});
    }
}

module.exports = {requireAuth, checkUser}