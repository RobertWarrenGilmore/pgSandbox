'use strict'
const transportModule = require('./general')

module.exports = transportModule([
  {
    path: '/',
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
      }
    }
  },
  {
    path: '/:userId',
    actions: {
      get: {
        bizMethod: 'read'
      },
      put: {
        bizMethod: 'update'
      }
    }
  },
  {
    path: '/:userId/avatar.jpg',
    actions: {
      get: {
        bizMethod: 'serveAvatar',
        extraResponse: res => {
          res.type('jpeg')
        }
      }
    }
  }
])
