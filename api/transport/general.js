'use strict'
const express = require('express')

const generalTransportModule = routes => bizModule => {

  const router = express.Router({
    mergeParams: true
  })

  fn => (req, res, next) => {
    let fnResult = fn(req, res)
    if (fnResult.then) {
      fnResult
        .then(promiseResult => res.send(promiseResult))
        .catch(next)
    } else {
      res.send(fnResult)
    }
  }

  routes.forEach(route => {
    for (let httpMethod in route.actions) {
      const bizMethod = bizModule[route.actions[httpMethod].bizMethod]
      router[httpMethod](route.path, (req, res, next) => {
        bizMethod(req)
          .then(result => {
            const extraResponse = route.actions[httpMethod].extraResponse
            if (extraResponse)
              extraResponse(res)
            res.send(result)
          })
          .catch(next)
      })
    }
  })

  return router

}

module.exports = generalTransportModule
