'use strict'
const express = require('express')
const handleError = require('./handleError')

module.exports = blogPostsBiz => {
  const router = express.Router({
    mergeParams: true
  })

  // posts in general
  router.route('/')
    .get((req, res) =>
      blogPostsBiz.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )

  // a specific post
  router.route('/:postId')
    .post((req, res) =>
      blogPostsBiz.create(req)
        .then(res.status(201).send.bind(res))
        .catch(handleError(res))
    )
    .get((req, res) =>
      blogPostsBiz.read(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )
    .put((req, res) =>
      blogPostsBiz.update(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )
    .delete((req, res) =>
      blogPostsBiz.delete(req)
        .then(res.send.bind(res))
        .catch(handleError(res))
    )

  return router
}
