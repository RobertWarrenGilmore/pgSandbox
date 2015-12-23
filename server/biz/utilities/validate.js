var _ = require('lodash');
var Checkit = require('checkit');
var MalformedRequestError = require('../../errors/malformedRequestError');

function validate(object, validations) {
  var acceptableAttributes = Object.keys(validations);
  // Find the items that have 'notNull' as a validation.
  var notNullAttributes = _.filter(acceptableAttributes, function (attribute) {
    return validations[attribute].indexOf('notNull') !== -1;
  });
  // Remove 'notNull' validations for checkit.
  var strippedValdations = _.mapValues(validations, function (field) {
    return _.reject(field, function (rule) {
      return rule === 'notNull';
    });
  });
  return new Checkit(strippedValdations).run(object).then(function () {
    for (var attribute in object) {
      if (acceptableAttributes.indexOf(attribute) === -1) {
        throw new MalformedRequestError('The attribute ' + attribute + ' is invalid.');
      }
      if (notNullAttributes.indexOf(attribute) !== -1 && object[attribute] === null) {
        throw new MalformedRequestError('The attribute ' + attribute + ' cannot be unset.');
      }
    }
  }).catch(Checkit.Error, function (err) {
    var message = '';
    for (var attribute in err.errors) {
      message = attribute + '\n';
      var attrErrs = err.errors[attribute].errors;
      for (var i in attrErrs) {
        var specificErr = attrErrs[i];
        // If we have anything other than a ValidationError or a MalformedRequestError, throw it and forget about the rest.
        if (!(specificErr instanceof Checkit.ValidationError)
          && !(specificErr instanceof MalformedRequestError)) {
          throw specificErr;
        }
        var messageEndsWithPeriod = _.endsWith(specificErr.message, '.');
        message += '  ' + specificErr.message + (messageEndsWithPeriod ? '' : '.') + '\n';
      }
    }
    message = message.trim();
    throw new MalformedRequestError(message);
  });
}
module.exports = validate;
