'use strict';
var express = require('express');
var handleError = require('./handleError');

module.exports = function (blogPost) {
  var router = express.Router({
    mergeParams: true
  });

  // posts in general
  router.route('/')
    .get(function (req, res) {
      blogPost.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res));
    });

  // a specific post
  router.route('/:postId')
    .post(function (req, res) {
      blogPost.create(req)
        .then(res.status(201).send.bind(res))
        .catch(handleError(res));
    })
    .get(function (req, res) {
      blogPost.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res));
    })
    .put(function (req, res) {
      blogPost.update(req)
        .then(res.send.bind(res))
        .catch(handleError(res));
    })
    .delete(function (req, res) {
      blogPost.delete(req)
        .then(res.send.bind(res))
        .catch(handleError(res));
    });

  return router;
};
