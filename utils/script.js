const fs = require("fs")
const jwt = require("jsonwebtoken");
const path = require('path');

module.exports.loadFileSQL = (fileName) => {
    const filePath = path.join(__dirname, '../sql', fileName); // ../ để đi lên 1 cấp từ utils
    return fs.readFileSync(filePath, 'utf-8');
}

module.exports.genJWT = (userId, maxAge) => {
    return jwt.sign({userId}, 'MT1607', {
        expiresIn: maxAge,
    });
}
