const {Router} = require('express');
const profileController = require('../controllers/profileController');
const {checkUser} = require("../middleware/authMiddleware");

const router = new Router();

router.post("/profile",checkUser, profileController.post_profile);
router.put("/profile",checkUser, profileController.put_profile);
router.get("/profile",checkUser, profileController.get_profile);

module.exports = router;