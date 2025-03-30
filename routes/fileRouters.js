const {Router} = require('express');
const fileController = require('../controllers/fileController');
const {checkUser} = require("../middleware/authMiddleware");
const s3Controller = require("../controllers/s3UserStorageController");

const router = new Router();

router.put('/files', checkUser, s3Controller.upload.array('files', 10), fileController.put_files);



module.exports = router;

