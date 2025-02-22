const {Client} = require("pg");

require("dotenv").config();

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }, // Kích hoạt SSL
});

client.connect()
    .then(() => {
        console.log('Connected to PostgreSQL database');

    })
    .catch((err) => {
        console.error('Error connecting to PostgreSQL database', err);
    });

module.exports = client;