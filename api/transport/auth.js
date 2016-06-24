'use strict'
const transportModule = require('./general')

module.exports = transportModule([
  {
    path: '/',
    actions: {
      get: {
        bizMethod: 'read'
      }
    }
  }
])
