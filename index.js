require('dotenv').config();
const express = require('express');
const authRouters = require('./routes/authRouters')
const cookie = require('cookie-parser')
const cors = require('cors');
const {requireAuth, checkUser} = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://localhost:3000',  // Cho phép FE truy cập
    credentials: true  // Cho phép gửi cookie
}));

app.use(cookie());
app.use(express.static('public'));
app.use(express.json())
app.use(authRouters);


app.set('views', './views');
app.set("view engine", "ejs");

app.get('/user', checkUser);
app.get('/' ,requireAuth ,(req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

