'use strict'
const transportModule = require('./general')

module.exports = transportModule([
  {
    path: '/',
    actions: {
      post: {
        bizMethod: 'setPassword'
      }
    }
  }
])
