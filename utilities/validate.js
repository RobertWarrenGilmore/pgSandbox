'use strict'
const _ = require('lodash')
const Promise = require('bluebird')

// a list of promises resolving to error messages for the given attribute
const messagePromiseList = (valueMap, key, validationList) =>
  _.map(validationList, validation =>
    Promise.try(() => validation(valueMap[key]))
    .then(() => null)
    .catch(ValidationError, err => {
      if (err.messages) {
        return err.messages
      } else {
        return err.message
      }
    })
  )

// a promise resolving to a (pruned) list of error messages for the given attribute
const messageListPromise = argMessagePromiseList =>
  Promise.all(argMessagePromiseList)
    .then(messageList => {
      // Prune the list or return the first item that is an object.
      for (let i in messageList) {
        if (_.isObject(messageList[i])) {
          return messageList[i]
        }
      }
      return _.filter(messageList, _.isString)
    })


// an object whose keys are from obj and whose values are promises resolving to lists of error messages.
const messageListPromiseMap = (valueMap, validationListMap) =>
  _.transform(
    _.union(_.keys(valueMap), _.keys(validationListMap)),
    (result, key) => {
      if (validationListMap[key] === undefined) {
        result[key] = Promise.resolve(['The attribute "' + key + '" was not expected.'])
      } else {
        const validationList = validationListMap[key]
        result[key] = messageListPromise(
          messagePromiseList(valueMap, key, validationList)
        )
      }
    },
    {}
  )

// Ideally a promise resolving to void if there are errors, rejects with a (pruned) object whose keys are from obj and whose values are lists of error messages.
const messageListMapPromise = argMessageListPromiseMap =>
  Promise.props(argMessageListPromiseMap)
  .then(messageLists => {
    messageLists = _.omit(messageLists, _.isEmpty)
    if (Object.keys(messageLists).length) {
      throw new ValidationError(messageLists)
    }
  })

const validate = (obj, validations) =>
  messageListMapPromise(
    messageListPromiseMap(obj, validations)
  )

const transformMessageListMapToLines = messageListMap =>
  _.transform(
    messageListMap,
    (result, messageList, attributeName) => {
      result.push(attributeName + ':')
      let messageLines
      if (_.isArray(messageList)) {
        messageLines = messageList
      } else if (_.isObject(messageList)) {
        // We need to go deeper.
        messageLines = transformMessageListMapToLines(messageList)
      }
      _.forEach(messageLines, line => result.push('  ' + line))
    },
    []
  )


const transformMessageListMapToString = messageListMap =>
  '\n' + transformMessageListMapToLines(messageListMap).join('\n')

function ValidationError(arg) {
  Error.call(this)
  this.name = this.constructor.name
  if (_.isString(arg)) {
    this.message = arg
  } else if (_.isObject(arg)) {
    this.messages = arg.messages || arg
    this.message = arg.message || transformMessageListMapToString(this.messages)
  } else {
    this.message = 'The request was malformed.'
  }
  Error.captureStackTrace(this, this.constructor)
}
ValidationError.prototype = Object.create(Error.prototype)
ValidationError.prototype.constructor = ValidationError
validate.ValidationError = ValidationError

const commonValidations = {
  undefined: (a, val) =>
    val === undefined,
  null: (a, val) =>
    val === undefined
    || val === null,
  notUndefined: (a, val) =>
    val !== undefined,
  notNull: (a, val) =>
    val === undefined
    || val !== null,
  object: (a, val) => {
    if (commonValidations.null(null, val)) {
      return true
    } else if (!_.isObject(val)) {
      return false
    } else if (!a) {
      return true
    } else {
      return validate(val, a)
    }
  },
  string: (a, val) =>
    val === undefined ||
    val === null ||
    _.isString(val),
  array: (a, val) =>
    val === undefined ||
    val === null ||
    _.isArray(val),
  boolean: (a, val) =>
    val === undefined
    || val === null
    || _.isBoolean(val)
    || val === 'true'
    || val === 'false',
  empty: (a, val) => commonValidations.maxLength(0, val),
  notEmpty: (a, val) => commonValidations.minLength(1, val),
  matchesRegex: (a, val) =>
    val === undefined
    || val === null
    || (_.isString(val) && val.match(a) !== null),
  maxLength: (a, val) =>
    val === undefined
    || val === null
    || val.length <= a,
  minLength: (a, val) =>
    val === undefined
    || val === null
    || val.length >= a,
  emailAddress: (a, val) => commonValidations.matchesRegex(/^.+@.+$/, val),
  naturalNumber: (a, val) =>
    val === undefined
    || val === null
    || commonValidations.matchesRegex(/^(0|[1-9][0-9]*)$/, '' + val),
  file: (a, val) => {
    if (val === undefined || val === null)
      return true
    if (!_.isString(val))
      return false

    // Check that val is a base64 data URL and extract the type and the data.
    const match = val.match(/^data:(.*);base64,([0-9a-zA-Z\+\/]*={0,2})$/)
    if (match === null)
      return false
    const type = match[1]
    const data = match[2]

    // Check the type against the type or types provided in the options.
    if (a.types && a.types.indexOf(type) === -1)
      return false
    else if (a.type && a.type !== type)
      return false

    // Check the size (in bytes) against the max size.
    if (a.maxSize) {
      let size = (data.length * 0.75)
      if (data.slice(-2) === '==')
        size -= 2
      else if (data.slice(-1) === '=')
        size -= 1
      if (size > a.maxSize)
        return false
    }
    return true
  }
}

validate.funcs = _.mapValues(commonValidations,
  rule => (message, options) => val => {
    let ruleResult = rule(options, val)
    if (ruleResult === false) {
      throw new ValidationError(message)
    } else if (!!ruleResult && !!ruleResult.then && !!ruleResult.catch) {
      return ruleResult
    }
  }
)

module.exports = validate
