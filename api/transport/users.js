'use strict'
const express = require('express')
const handleError = require('./handleError')

module.exports = usersBiz => {
  const router = express.Router({
    mergeParams: true
  })

  // users in general
  router.route('/')
    .post((req, res) =>
      usersBiz.create(req)
        .then(res.status(201).send.bind(res))
        .catch(handleError(res))
    )
    .get((req, res) =>
      usersBiz.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )
    .put((req, res) =>
      usersBiz.update(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )

  // a specific user
  router.route('/:userId')
    .get((req, res) =>
      usersBiz.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )
    .put((req, res) =>
      usersBiz.update(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )

  return router
}
