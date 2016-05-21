'use strict'
const generalTransportTest = require('./general')
const usersRouter = require('../../../api/transport/users')

generalTransportTest({
  moduleName: 'users',
  router: usersRouter,
  basePath: '/users',
  routes: [
    {
      path: '/',
      actions: {
        POST: 'create',
        GET: 'read',
        PUT: 'update'
      }
    },
    {
      path: '/:userId',
      actions: {
        GET: 'read',
        PUT: 'update'
      }
    },
    {
      path: '/:userId/avatar.jpg',
      actions: {
        GET: 'serveAvatar'
      }
    }
  ]
})
