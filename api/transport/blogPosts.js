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
  },
  {
    path: '/:postId',
    actions: {
      post: {
        bizMethod: 'create',
        extraResponse: res => {
          res.status(201)
        }
      },
      get: {
        bizMethod: 'read'
      },
      put: {
        bizMethod: 'update'
      },
      delete: {
        bizMethod: 'delete'
      }
    }
  }
])
