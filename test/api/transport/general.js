'use strict'
const Promise = require('bluebird')
const assert = require('assert')
const ajax = require('../../../client/utilities/ajax')
const sinon = require('sinon')
const http = require('http')
const express = require('express')
const parseAuth = require('basic-auth')
const bodyParser = require('body-parser')

const generalTransportTest = options => {
  describe(options.moduleName, () => {

    let responseBody

    const bizQueue = []

    function bizPromiseReturner() {
      const result = bizQueue.pop()
      if (result instanceof Error) {
        return Promise.reject(result)
      } else {
        return Promise.resolve(result)
      }
    }
    const biz = {}

    options.routes.forEach(route => {
      for (let actionName in route.actions) {
        const bizModuleName = route.actions[actionName]
        if (!biz[bizModuleName])
          biz[bizModuleName] = sinon.spy(bizPromiseReturner)
      }
    })

    let server

    before('Host the transport module on a server.', function () {
      const router = options.router(biz)
      const app = express()
      app.use(function authMiddleware(req, res, next) {
        const auth = parseAuth(req)
        if (auth) {
          req.auth = {
            emailAddress: auth.name,
            password: auth.pass
          }
        }
        next()
      })
      app.use(bodyParser.json({
        type: 'application/json'
      }))
      app.use('/api' + options.basePath, router)
      server = http.createServer(app)
      server.listen(3000)
    })

    after('Close the server.', function () {
      server.close()
    })

    beforeEach('Reset the biz stubs.', function () {
      options.routes.forEach(route => {
        for (let actionName in route.actions) {
          const bizModuleName = route.actions[actionName]
          if (biz[bizModuleName])
            biz[bizModuleName].reset()
        }
      })
      bizQueue.length = 0

      responseBody = {
        hello: 'world'
      }
      bizQueue.unshift(responseBody)
    })

    for (let i in options.routes) {
      const route = options.routes[i]
      const uri = options.basePath + route.path
      describe(uri, () => {
        for (let httpMethod in route.actions) {
          const bizMethod = route.actions[httpMethod]
          const auth = {
            emailAddress: 'abc@def.ghi',
            password: '123'
          }
          const query = {
            a: 'b',
            c: 'd'
          }
          const body = (httpMethod == 'HEAD') ? undefined : {
            w: 'x',
            y: 'z'
          }
          const params = {}
          const parametersInUri = uri.match(/(:[^\/]+)/g)
          let substitutedUri = uri
          if (parametersInUri)
            for (let k in parametersInUri) {
              const parameterName = parametersInUri[k]
              const parameterValue = k
              params[parameterName.substring(1)] = parameterValue
              substitutedUri = substitutedUri.replace(parameterName, parameterValue)
            }
          const requestMatcher = sinon.match({
            auth: sinon.match(auth),
            query: sinon.match(query),
            body: sinon.match(body),
            params: sinon.match(params)
          })
          describe(httpMethod, () => {
            it(`should call ${bizMethod}`, () =>
              ajax({
                method: httpMethod,
                uri: `http://localhost:3000/api${substitutedUri}`,
                json: true,
                auth,
                qs: query,
                body
              })
              .then(response => {
                assert(biz[bizMethod].withArgs(requestMatcher).calledOnce, 'The biz mock was not called properly.')
                assert.deepEqual(biz[bizMethod].getCall(0).args[0].params, params, 'The wrong URI parameters were passed to the biz mock.')
                assert.deepEqual(response.body, responseBody, 'The router returned the wrong response.')
              })
            )
            it(`should forward generic errors`, () => {
              bizQueue.pop()
              const error = new Error()
              bizQueue.unshift(error)
              return ajax({
                method: httpMethod,
                uri: `http://localhost:3000/api${substitutedUri}`,
                json: true,
                auth,
                qs: query,
                body
              }).then(response => {
                assert.equal(response.statusCode, 500, 'The router returned the wrong thing.')
              })
            })
          })
        }
      })
    }


  })

}

module.exports = generalTransportTest
