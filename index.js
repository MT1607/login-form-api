require('dotenv').config();
const cors = require('cors');

const express = require('express');
const authRouters = require('./routes/authRouters');
const profileRouters = require('./routes/profileRouters');
const cookie = require('cookie-parser');
const {requireAuth, checkUser} = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://localhost:3000', // Cho phép frontend ở port 3000 gọi API
    credentials: true, // Cho phép gửi cookies nếu cần
}));

app.use(cookie());
app.use(express.static('public'));
app.use(express.json())
app.use("/api/auth" ,authRouters);
app.use("/api/auth", profileRouters);


app.set('views', './views');
app.set("view engine", "ejs");

app.get('/api/auth/user', checkUser);
app.get('/api/auth' ,requireAuth ,(req, res) => {
    res.status(200).send({message: "Success"});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/api/auth`);
});

