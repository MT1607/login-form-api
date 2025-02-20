const jwt = require('jsonwebtoken');
const client = require("../db");
const {loadFileSQL} = require("../utils/script");

const requireAuth = (req, res, next) => {
    console.log("Required auth user !!!");
    const token = req.cookies.jwt;

    if (token) {
        jwt.verify(token, "MT1607", (error, decodedToken) => {
            if (error) {
                console.log(error.message);
                // res.redirect('http://localhost:3000/login');
                res.status(401).send({message: "Dont' have token"});
            } else {
                console.log(decodedToken);
                next();
            }
        })
    } else {
        // res.redirect('http://localhost:3000/login');
        res.status(401).send({message: "User isn't logged in"});
    }
}

const checkUser = (req, res, next) => {
    const token = req.cookies.jwt;

    if (token) {
        jwt.verify(token, "MT1607", async (error, decodedToken) => {
            if (error) {
                console.log(error.message);
                res.status(403).send({message: "Not found token", error});
                res.locals.user = null;
                next()
            } else {
                console.log(decodedToken);
                const querySQL = loadFileSQL("getUserById.sql")
                const user = await client.query(querySQL, [decodedToken.userId]);

                res.status(200).send({user: user.rows[0]});
                res.locals.user = user.rows[0];
                next();
            }
        })
    } else {
        res.locals.user = null;
        res.status(402).send({message: "Not found user"});
        next()
    }
}

module.exports = {requireAuth, checkUser}