'use strict'
const auth = require('./auth')
const infoPages = require('./infoPages')
const blogPosts = require('./blogPosts')
const users = require('./users')
const emailer = require('../../utilities/emailer')

module.exports = knex => ({
  // This list gets longer as business modules are added.
  auth: auth(knex),
  infoPages: infoPages(knex),
  blogPosts: blogPosts(knex),
  users: users(knex, emailer)
})
