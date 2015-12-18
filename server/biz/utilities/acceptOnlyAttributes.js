var MalformedRequestError = require('../../errors/malformedRequestError');

function acceptOnlyAttributes(object, acceptable, errorMessage) {
  for (var attribute in object) {
    if (acceptable.indexOf(attribute) === -1) {
      throw new MalformedRequestError(errorMessage(attribute));
    }
  }
}

module.exports = acceptOnlyAttributes;
