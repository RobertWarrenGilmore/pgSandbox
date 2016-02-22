'use strict'
const express = require('express')
const handleError = require('./handleError')

module.exports = authBiz => {
  const router = express.Router({
    mergeParams: true
  })

  router.route('/')
    .get((req, res) =>
      authBiz.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )

  return router
}
