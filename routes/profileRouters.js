const {Router} = require('express');
const profileController = require('../controllers/profileController');

const router = new Router();

router.post("/profile", profileController.post_profile);
router.put("/profile", profileController.put_profile);
router.get("/profile", profileController.get_profile);

module.exports = router;