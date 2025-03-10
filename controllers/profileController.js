const {loadFileSQL} = require("../utils/script");
const client = require("../db");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

module.exports.post_profile = async (req, res) => {
    res.send("create profile")
}

module.exports.put_profile = async (req, res) => {
    try {
        const jwtToken = req.cookies.jwt;
        if (!jwtToken) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decodedToken = await promisify(jwt.verify)(jwtToken, "MT1607");
        const { firstName, lastName, avatarUrl, dateOfBirth } = req.body;
        const userId = decodedToken.userId;

        if (!firstName || !lastName || !dateOfBirth) {
            return res.status(400).json({ message: "Missing required fields!" });
        }

        const qrUpdateProfile = loadFileSQL("updateProfile.sql");
        await client.query(qrUpdateProfile, [firstName, lastName, avatarUrl || null, dateOfBirth, userId]);

        return res.status(200).json({ message: "Profile updated successfully!" });

    } catch (e) {
        console.error("Error in put_profile:", e);
        return res.status(500).json({ message: "Server error!" });
    }
};

module.exports.get_profile = async (req, res) => {
    try {
        const jwtToken = req.cookies.jwt;
        if (!jwtToken) {
            return res.status(401).json({message: "Unauthorized"});
        }
        const decodeToken = await promisify(jwt.verify)(jwtToken, "MT1607");
        const userId = decodeToken.userId;
        const qrGetProfile = loadFileSQL("getProfile.sql");
        const profileData = await client.query(qrGetProfile, [userId]);
        if (!profileData.rows[0]){
            return res.status(404).json({message: "No Profile Found"});
        }
        return res.status(200).json({message: "Profile Found", profile: profileData.rows[0]});
    } catch (e) {
        return res.status(500).json({message: "Server error!"});
    }
}