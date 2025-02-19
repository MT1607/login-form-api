const fs = require("fs")
const jwt = require("jsonwebtoken");

module.exports.loadFileSQL = (fileName) => {
    const path = `D:/personal/login-form-api/sql/${fileName}`;
    return fs.readFileSync(path, 'utf-8');
}

module.exports.genJWT = (userId, maxAge) => {
    return jwt.sign({userId}, 'MT1607', {
        expiresIn: maxAge,
    });
}
