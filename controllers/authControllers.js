
const client = require("../db");
const validator = require("validator");
const bcrypt = require("bcrypt");

const {loadFileSQL, genJWT} = require("../utils/script");
const {createUserFolder} = require("./s3UserStorageController");

module.exports.get_login = (req, res) => {
    res.render("login")
}

module.exports.get_register = (req, res) => {
    res.render("register")
}

module.exports.post_login = async (req, res) => {
    const {email, password} = req.body;

    try {
        const queryGetUser = loadFileSQL('getUser.sql');
        const resGetUser = await client.query(queryGetUser, [email]);

        if (resGetUser.rows.length === 0) {
           return res.status(400).json({message: "Email incorrect"});
        }

        const result = await bcrypt.compare(password, resGetUser.rows[0].password);
        if (!result) {
            return res.status(400).json({message: "Password incorrect"});
        }

        const jwtToken = req.cookies.jwt;
        if (!jwtToken) {
            const token = genJWT(resGetUser.rows[0].id, '3m');
            res.cookie('jwt', token, { httpOnly: true, maxAge: 3 * 60 * 1000 });
        }

        return res.status(200).json({message: "Found user successfully", user: resGetUser.rows[0]});
    } catch (e) {
        return res.status(500).json({message: "Server error"});
    }
}

module.exports.post_register = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(404).json({message: "Not found body"});
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Email is invalid" });
    }

    if (!validator.isLength(password, { min: 6 })) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    try {

        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        const qrCreateUserSQL = loadFileSQL('createUser.sql');
        const result = await client.query(qrCreateUserSQL, [email, hashedPassword]);

        const createdUser = result.rows[0].user_id;
        const token = genJWT(createdUser, '3m');

        res.cookie('jwt', token, { httpOnly: true, maxAge: 3 * 60 * 1000 });
        const folderCreated = await createUserFolder(createdUser.toString());

        if (!folderCreated) {
            console.error(`Failed to create storage folder for user ${createdUser}`);
        }

        return res.status(200).json({ message: "Create User successfully", user: {email} });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({message: "User already exist"});
        }

        return res.status(500).json({message: "Server error"});
    }
};

module.exports.get_logout = (req, res) => {
    res.cookie("jwt", "", {maxAge: 1});
    res.redirect("/");
}
