'use strict'
const validate = require('../../utilities/validate')
const { ValidationError } = validate

module.exports = body => {
  if (body.messages) {
    throw new ValidationError(body)
  } else {
    throw new Error(body)
  }
}
