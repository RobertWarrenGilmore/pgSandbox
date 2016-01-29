'use strict'
var express = require('express')
var handleError = require('./handleError')

module.exports = function (auth) {
  var router = express.Router({
    mergeParams: true
  })

  router.route('/')
    .get(function (req, res) {
      auth.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    })

  return router
}
