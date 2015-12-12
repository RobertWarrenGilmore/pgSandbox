var authRouter = require('./auth');
var infoPageRouter = require('./infoPage');
var userRouter = require('./user');
var express = require('express');
var parseAuth = require('basic-auth');
var bodyParser = require('body-parser');

module.exports = function (biz) {
  var router = express.Router({
    mergeParams: true
  });

  // Get the auth.
  router.use(function authMiddleware(req, res, next) {
    var auth = parseAuth(req);
    if (auth) {
      req.auth = {
        emailAddress: auth.name,
        password: auth.pass
      };
    }
    next();
  });

  // Parse the body.
  router.use(bodyParser.json({
    type: 'application/json'
  }));

  // Assign the routers to routes.
  // This list gets longer as API endpoints are added.
  router.use('/auth', authRouter(biz.auth));
  router.use('/infoPages', infoPageRouter(biz.infoPage));
  router.use('/users', userRouter(biz.user));
  router.use('/*', function (req, res) {
    res.status(404).send('There is no such API endpoint.');
  });

  return router;
};
