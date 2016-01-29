'use strict'
var express = require('express')
var handleError = require('./handleError')

module.exports = function (infoPage) {
  var router = express.Router({
    mergeParams: true
  })

  router.route('/:pageId')
    .get(function (req, res) {
      infoPage.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    }).put(function (req, res) {
      infoPage.update(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    })

  return router
}
