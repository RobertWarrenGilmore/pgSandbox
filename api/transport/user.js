var express = require('express');
var handleError = require('./handleError');

module.exports = function (user) {
  var router = express.Router({
    mergeParams: true
  });

  // users in general
  router.route('/')
    .post(function (req, res) {
      user.create(req)
        .then(res.status(201).send.bind(res))
        .catch(handleError(res));
    })
    .get(function (req, res) {
      user.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res));
    })
    .put(function (req, res) {
      user.update(req)
        .then(res.send.bind(res))
        .catch(handleError(res));
    });

  // a specific user
  router.route('/:userId')
    .get(function (req, res) {
      user.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res));
    })
    .put(function (req, res) {
      user.update(req)
        .then(res.send.bind(res))
        .catch(handleError(res));
    });

  return router;
};
