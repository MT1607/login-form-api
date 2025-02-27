
const client = require("../db");
const validator = require("validator");
const bcrypt = require("bcrypt");

const {loadFileSQL, genJWT} = require("../utils/script");

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
           return res.status(400).send("Email incorrect");
        }

        const result = await bcrypt.compare(password, resGetUser.rows[0].password);
        if (!result) {
            return res.status(400).send("Password incorrect");
        }

        const jwtToken = req.cookies.jwt
        if (!jwtToken) {
            const token = genJWT(resGetUser.rows[0].id, '3m');
            res.cookie('jwt', token, { httpOnly: true, maxAge: 3 * 60 * 1000 });
        }

        res.status(200).send({message: "Found user successfully", user: resGetUser.rows[0]});
    } catch (e) {
        console.error("Server error: ",e);
        res.status(500).send({message: "Server error"});
    }
}

module.exports.post_register = async (req, res) => {
    const { email, password } = req.body;
    console.log(req.body);

    if (!email || !password) {
        return res.status(404).send("Not found body ");
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Email is invalid" });
    }

    if (!validator.isLength(password, { min: 6 })) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    try {

        // Mã hóa password
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo user mới
        const qrCreateUserSQL = loadFileSQL('createUser.sql');
        const result = await client.query(qrCreateUserSQL, [email, hashedPassword]);

        // Tạo token jwt
        const createdUser = result.rows[0];
        const token = genJWT(createdUser.id, '3m');

        res.cookie('jwt', token, { httpOnly: true, maxAge: 3 * 60 * 1000 });

        return res.status(200).json({ message: "Create User successfully", user: {email} });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).send("User already exist");
        }

        return res.status(500).send("Server Error");
    }
};

module.exports.get_logout = (req, res) => {
    res.cookie("jwt", "", {maxAge: 1});
    res.redirect("/");
}
