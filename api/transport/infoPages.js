'use strict'
const transportModule = require('./general')

module.exports = transportModule([
  {
    path: '/:pageId',
    actions: {
      get: {
        bizMethod: 'read'
      },
      put: {
        bizMethod: 'update'
      }
    }
  }
])
