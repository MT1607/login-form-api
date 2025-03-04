const {loadFileSQL} = require("../utils/script");
const client = require("../db");
const jwt = require("jsonwebtoken");

module.exports.post_profile = async (req, res) => {
    res.send("create profile")
}

module.exports.put_profile = async (req, res) => {
    res.send("update profile");
}

module.exports.get_profile = async (req, res) => {
    try {
        const jwtToken = req.cookies.jwt;
        console.log("jwt token: ",jwtToken);
        if (!jwtToken) {
            return res.status(401).send("Unauthorized");
        }

        jwt.verify(jwtToken, "MT1607", async (error, decodedToken)=>{
            if (error) {
                res.status(401).send({message: "Have error token !"});
            } else {
                const qrGetProfile = loadFileSQL("getProfile.sql");
                const profileData = await client.query(qrGetProfile, [decodedToken.userId]);
                if (!profileData.rows[0]){
                    return res.status(404).send({message: "No Profile Found"});
                }
                return res.status(200).send({profile: profileData.rows[0]});
            }
        })
    } catch (e) {
        res.status(500).send({message: "Server error! "});
    }
}