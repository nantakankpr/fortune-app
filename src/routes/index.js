const express = require('express');
const router = express.Router();
const webRoutes = require('./webRoute');
const authApp = require('./authRoute');
const orderRoutes = require('./orderRoute');
const adminRoutes = require('./adminRoute');

// Define the routes
router.use('/', webRoutes);
router.use('/auth', authApp);
router.use('/order', orderRoutes);
router.use('/admin', adminRoutes);


module.exports = router;