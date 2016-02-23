'use strict'
require('dotenv').load()
process.env.NODE_ENV = 'testing'
const Promise = require('bluebird')

before('Configure promises.', () => {
  Promise.config({
    cancellation: true
  })
})

require('./api')
