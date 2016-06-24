'use strict'
const _ = require('lodash')
const request = require('request')
const AuthenticationError = require('../../errors/authenticationError')
const AuthorisationError = require('../../errors/authorisationError')
const ConflictingEditError = require('../../errors/conflictingEditError')
const MalformedRequestError = require('../../errors/malformedRequestError')
const NoSuchResourceError = require('../../errors/noSuchResourceError')
const ServerError = require('../../errors/serverError')

module.exports = function (options) {
  return new Promise(function (resolve, reject) {
    const optionsClone = _.cloneDeep(options)
    if (optionsClone.auth && optionsClone.auth.emailAddress) {
      optionsClone.auth.username = optionsClone.auth.emailAddress
      delete optionsClone.auth.emailAddress
    }
    if (_.startsWith(optionsClone.uri, '/')) {
      optionsClone.uri = window.location.origin + optionsClone.uri
    }
    request(optionsClone, (error, response, body) => {
      if (error) {
        error.message = error.message || 'The server could not be reached.'
        reject(error)
      } else if (response.statusCode != 200 && response.statusCode != 201) {
        if (response.statusCode == 400)
          reject(new MalformedRequestError(response.body))
        else if (response.statusCode == 418) // IE mishandles 401.
          reject(new AuthenticationError(response.body))
        else if (response.statusCode == 403)
          reject(new AuthorisationError(response.body))
        else if (response.statusCode == 404)
          reject(new NoSuchResourceError(response.body))
        else if (response.statusCode == 409)
          reject(new ConflictingEditError(response.body))
        else if (response.statusCode == 500)
          reject(new ServerError(response.body))
        else
          reject(new Error('It looks like there was an unforeseen error in the client app. Oops.'))
      } else {
        resolve(response.body)
      }
    })
  })
}
