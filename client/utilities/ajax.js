'use strict'
const request = require('request')
const Promise = require('bluebird')
const _ = require('lodash')

module.exports = function (options) {
  return new Promise(function (resolve, reject) {
    const optionsClone = _.cloneDeep(options)
    if (optionsClone.auth && optionsClone.auth.emailAddress) {
      optionsClone.auth.username = optionsClone.auth.emailAddress
      delete optionsClone.auth.emailAddress
    }
    if (_.startsWith(optionsClone.uri, '/')) {
      if (!window.location.origin) {
        window.location.origin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port: '')
      }
      optionsClone.uri = window.location.origin + optionsClone.uri
    }
    request(optionsClone, function (error, response, body) {
      if (error) {
        console.error(error)
        error.message = 'The server could not be reached.'
        reject(error)
      } else {
        resolve(response)
      }
    })
  })
}
