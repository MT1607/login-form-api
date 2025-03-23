const {loadFileSQL} = require("../utils/script");
const client = require("../db");
const {upload, uploadFileToS3, getFileDownloadUrl} = require("./s3UserStorageController");
const fs = require('fs');

// Middleware for handling file uploads
const avatarUpload = upload.single('avatar');

module.exports.post_profile = async (req, res) => {
    res.send("create profile")
}

module.exports.put_profile = async (req, res) => {
    try {
        // Use multer middleware to handle potential file upload
        avatarUpload(req, res, async (err) => {
            if (err) {
                console.error("Error uploading file:", err);
                return res.status(400).json({ message: "Error uploading avatar: " + err.message });
            }

            const { first_name, last_name, date_of_birth, avatar_url: existingAvatarUrl } = req.body;
            const userId = req.user.id;

            if (!userId) {
                console.log("user id: ", userId);
                return res.status(401).json({ message: "User not authenticated" });
            }

            if (!first_name || !last_name || !date_of_birth) {
                // Clean up uploaded file if it exists but other fields are missing
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ message: "Missing required fields!" });
            }

            // Default avatar handling
            let avatarUrl = existingAvatarUrl;

            // If avatarUrl is explicitly set to "null" or empty string in the request body,
            // we'll set it to null to remove the existing avatar
            if (existingAvatarUrl === "null" || existingAvatarUrl === "") {
                avatarUrl = null;
            }

            // If a new avatar file was uploaded, process it
            if (req.file) {
                try {
                    // Upload file to S3 in the user's folder
                    const uploadResult = await uploadFileToS3(userId, req.file);

                    // Get a signed URL for the avatar
                    avatarUrl = await getFileDownloadUrl(uploadResult.key);

                    // Clean up temporary file
                    fs.unlinkSync(req.file.path);

                    console.log("Avatar uploaded successfully:", uploadResult.key);
                } catch (uploadErr) {
                    console.error("Error uploading to S3:", uploadErr);

                    // Clean up temporary file if it exists
                    if (req.file && fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }

                    return res.status(500).json({ message: "Error uploading avatar to storage" });
                }
            }

            // Update profile in database with the appropriate avatar URL value
            const qrUpdateProfile = loadFileSQL("updateProfile.sql");
            await client.query(qrUpdateProfile, [first_name, last_name, avatarUrl, date_of_birth, userId]);

            return res.status(200).json({
                message: "Profile updated successfully!",
                data: {
                    avatar_url: avatarUrl,
                }
            });
        });
    } catch (e) {
        console.error("Server error:", e);
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