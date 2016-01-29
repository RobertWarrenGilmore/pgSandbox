'use strict'
require('dotenv').load()
process.env.NODE_ENV = 'testing'
var Promise = require('bluebird')

before('Configure promises.', function () {
  Promise.config({
    cancellation: true
  })
})

require('./api')
