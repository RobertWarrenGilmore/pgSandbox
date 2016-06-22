'use strict'
const express = require('express')
const handleError = require('./handleError')

module.exports = usersBiz => {
  const router = express.Router({
    mergeParams: true
  })

  router.route('/')
    .put((req, res) =>
      usersBiz.setPassword(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )

  return router
}
