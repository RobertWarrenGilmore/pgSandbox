'use strict'
const authRouter = require('./auth')
const infoPagesRouter = require('./infoPages')
const blogPostsRouter = require('./blogPosts')
const usersRouter = require('./users')
const setPasswordRouter = require('./setPassword')
const express = require('express')
const parseAuth = require('basic-auth')
const bodyParser = require('body-parser')
const NoSuchResourceError = require('../../errors/noSuchResourceError')

module.exports = biz => {
  const router = express.Router({
    mergeParams: true
  })

  // Get the auth.
  router.use((req, res, next) => {
    const auth = parseAuth(req)
    if (auth) {
      req.auth = {
        emailAddress: auth.name,
        password: auth.pass
      }
    }
    next()
  })

  // Parse the body.
  router.use(bodyParser.json({
    type: 'application/json',
    limit: '200kB'
  }))

  // Assign the routers to routes.
  // This list gets longer as API endpoints are added.
  router.use('/auth', authRouter(biz.auth))
  router.use('/infoPages', infoPagesRouter(biz.infoPages))
  router.use('/blog', blogPostsRouter(biz.blogPosts))
  router.use('/users', usersRouter(biz.users))
  router.use('/setPassword', setPasswordRouter(biz.users))
  router.use('/*', (req, res, next) => {
    throw new NoSuchResourceError('There is no such API endpoint.')
  })

  router.use((err, req, res, next) => {
    if (res.headersSent)
      return next(err)
    res.status(err.errorCode || 500)
    const body = {
      messages: err.messages,
      message: err.message
    }
    res.send(body)
  })

  return router
}
