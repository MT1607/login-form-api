const {Router} = require('express');
const authController = require('../controllers/authControllers');

const router = new Router();

router.get('/login', authController.get_login)
router.post('/login', authController.post_login)
router.get('/register', authController.get_register)
router.post('/register', authController.post_register)
router.get('/logout', authController.get_logout)

module.exports = router;