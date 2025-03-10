const {loadFileSQL} = require("../utils/script");
const client = require("../db");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

module.exports.post_profile = async (req, res) => {
    res.send("create profile")
}

module.exports.put_profile = async (req, res) => {
    try {
        const { firstName, lastName, avatarUrl, dateOfBirth } = req.body;
        const userId = req.user.id;

        if (!userId) {
            console.log("user id: ", userId);
        }

        if (!firstName || !lastName || !dateOfBirth) {
            return res.status(400).json({ message: "Missing required fields!" });
        }

        const qrUpdateProfile = loadFileSQL("updateProfile.sql");
        await client.query(qrUpdateProfile, [firstName, lastName, avatarUrl || null, dateOfBirth, userId]);

        return res.status(200).json({ message: "Profile updated successfully!" });

    } catch (e) {
        return res.status(500).json({ message: "Server error!" });
    }
};

module.exports.get_profile = async (req, res) => {
    try {
        const userId = req.user.id;
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