'use strict'
const express = require('express')
const handleError = require('./handleError')

module.exports = infoPagesBiz => {
  const router = express.Router({
    mergeParams: true
  })

  router.route('/:pageId')
    .get((req, res) =>
      infoPagesBiz.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    ).put((req, res) =>
      infoPagesBiz.update(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )

  return router
}
