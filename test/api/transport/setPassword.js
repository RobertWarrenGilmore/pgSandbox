'use strict'
const generalTransportTest = require('./general')
const setPasswordRouter = require('../../../api/transport/setPassword')

generalTransportTest({
  moduleName: 'setPassword',
  router: setPasswordRouter,
  basePath: '/setPassword',
  routes: [
    {
      path: '/',
      actions: {
        PUT: 'setPassword'
      }
    }
  ]
})
