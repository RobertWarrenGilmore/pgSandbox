var express = require('express');
var handleError = require('./handleError');

module.exports = function (blogPost) {
  var router = express.Router({
    mergeParams: true
  });

  router.route('/:postId')
    .get(function (req, res) {
      blogPost.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res));
    });

  return router;
};
