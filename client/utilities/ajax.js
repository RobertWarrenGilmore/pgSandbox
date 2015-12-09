var request = require('request');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = function ajax(options) {
  return new Promise(function (resolve, reject, onCancel) {
    var optionsClone = _.cloneDeep(options);
    if (_.startsWith(optionsClone.uri, '/')) {
      if (!window.location.origin) {
        window.location.origin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port: '');
      }
      optionsClone.uri = window.location.origin + optionsClone.uri;
    }
    var r = request(optionsClone, function (error, response, body) {
      if (error) {
        console.error(error);
        error.message = 'The server could not be reached.';
        reject(error);
      } else {
        resolve(response);
      }
    });
    onCancel(function () {
      r.abort();
    });
  });
};
