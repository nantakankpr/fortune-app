const express = require('express');
const mdw = require('../middlewares');
const router = express.Router();

router.get('/dashboard', (req, res) => {
  res.render('admin/dashboard', {layout : 'layouts/adminPage'});
});

router.get('/transactions', (req, res) => {
  if (req.device.type === 'phone') {
    res.render('admin/transactionsMobile' , {});
  }else{
    res.render('admin/transactions' , {});
  }
});

router.get('/members', (req, res) => {
  res.render('admin/members' , {});
});

router.get('/help', (req, res) => {
  res.render('admin/help' , {layout : 'layouts/adminPage'});
});

router.get('/login', (req, res) => {
    return res.render('admin/login', {});
});

router.get('/test', (req, res) => {
    return res.render('admin/test', {});
});




module.exports = router;