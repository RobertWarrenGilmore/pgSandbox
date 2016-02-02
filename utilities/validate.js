'use strict'
var _ = require('lodash')
var Promise = require('bluebird')

// a list of promises resolving to error messages for the given attribute
function messagePromiseList (value, validationList) {
  return _.map(validationList, function (validation) {
    return Promise.try(function () {
      return validation(value)
    }).then(function () {
      return null
    }).catch(ValidationError, function (err) {
      if (err.messages) {
        return err.messages
      } else {
        return err.message
      }
    })
  })
}

// a promise resolving to a (pruned) list of error messages for the given attribute
function messageListPromise (argMessagePromiseList) {
  return Promise.all(argMessagePromiseList)
    .then(function (messageList) {
      // Prune the list or return the first item that is an object.
      for (var i in messageList) {
        if (_.isObject(messageList[i])) {
          return messageList[i]
        }
      }
      return _.filter(messageList, _.isString)
    })
}

// an object whose keys are from obj and whose values are promises resolving to lists of error messages.
function messageListPromiseMap (valueMap, validationListMap) {
  var keys = _.union(_.keys(valueMap), _.keys(validationListMap))
  return _.transform(keys, function (result, key) {
    if (validationListMap[key] === undefined) {
      result[key] = Promise.resolve(['The attribute "' + key + '" was not expected.'])
    } else {
      var value = valueMap[key]
      var validationList = validationListMap[key]
      result[key] = messageListPromise(
        messagePromiseList(value, validationList)
      )
    }
  }, {})
}

// Ideally a promise resolving to void if there are errors, rejects with a (pruned) object whose keys are from obj and whose values are lists of error messages.
function messageListMapPromise (argMessageListPromiseMap) {
  return Promise.props(argMessageListPromiseMap).then(function(messageLists) {
    messageLists = _.omit(messageLists, _.isEmpty)
    if (Object.keys(messageLists).length) {
      throw new ValidationError(messageLists)
    }
  })
}

function validate(obj, validations) {
  return messageListMapPromise(
    messageListPromiseMap(obj, validations)
  )
}

function transformMessageListMapToLines(messageListMap) {
  return _.transform(messageListMap, function (result, messageList, attributeName) {
    result.push(attributeName + ':')
    var messageLines
    if (_.isArray(messageList)) {
      messageLines = messageList
    } else if (_.isObject(messageList)) {
      // We need to go deeper.
      messageLines = transformMessageListMapToLines(messageList)
    }
    _.forEach(messageLines, function (line) {
      result.push('  ' + line)
    })
  }, [])
}

function transformMessageListMapToString(messageListMap) {
  return '\n' + transformMessageListMapToLines(messageListMap).join('\n')
}

function ValidationError(message) {
  Error.call(this)
  this.name = this.constructor.name
  if (_.isString(message)) {
    this.message = message
  } else if (_.isObject(message)) {
    this.messages = message
    this.message = transformMessageListMapToString(this.messages)
  } else {
    this.message = 'The request was malformed.'
  }
  Error.captureStackTrace(this, this.constructor)
}
ValidationError.prototype = Object.create(Error.prototype)
ValidationError.prototype.constructor = ValidationError
validate.ValidationError = ValidationError

var commonValidations = {
  undefined: function (a, val) {
    return val === undefined
  },
  null: function (a, val) {
    return val === undefined
      || val === null
  },
  notUndefined: function (a, val) {
    return val !== undefined
  },
  notNull: function (a, val) {
    return val === undefined
      || val !== null
  },
  object: function (a, val) {
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
  string: function (a, val) {
    return val === undefined
      || val === null
      || _.isString(val)
  },
  boolean: function (a, val) {
    return val === undefined
      || val === null
      || _.isBoolean(val)
      || val === 'true'
      || val === 'false'
  },
  empty: function (a, val) {
    return commonValidations.maxLength(0, val)
  },
  notEmpty: function (a, val) {
    return commonValidations.minLength(1, val)
  },
  matchesRegex: function (a, val) {
    return val === undefined
      || val === null
      || (_.isString(val) && val.match(a) !== null)
  },
  maxLength: function (a, val) {
    return val === undefined
      || val === null
      || val.length <= a
  },
  minLength: function (a, val) {
    return val === undefined
      || val === null
      || val.length >= a
  },
  emailAddress: function (a, val) {
    return commonValidations.matchesRegex(/^.+@.+$/, val)
  },
  naturalNumber: function (val) {
    return val === undefined
      || val === null
      || val.match(/^(0|[1-9][0-9]*)$/) !== null
  }
}

validate.funcs = _.mapValues(commonValidations,
  function (rule) {
    return function (message, options) {
      return function (val) {
        var ruleResult = rule(options, val)
        if (ruleResult === false) {
          throw new ValidationError(message)
        } else if (!!ruleResult && !!ruleResult.then && !!ruleResult.catch) {
          return ruleResult
        }
      }
    }
  }
)

module.exports = validate
