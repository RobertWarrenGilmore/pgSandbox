var _ = require('lodash');
var acceptOnlyAttributes = require('./acceptOnlyAttributes');

function validateAndTransform(object, options) {
  var acceptedAttributes = options.acceptableAttributes;
  var checkIt = options.checkIt;
  var transform = options.transform;
  return checkIt.run(object).then(function () {
    if (acceptedAttributes) {
      acceptOnlyAttributes(object, acceptedAttributes, function (attribute) {
        return 'The attribute ' + attribute + ' cannot be written during this operation.';
      });
    }
    if (!transform) {
      transform = _.cloneDeep;
    }
    return transform(object);
  });
}
module.exports = validateAndTransform;
