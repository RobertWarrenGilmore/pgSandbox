var request = require('request');
var Promise = require('bluebird');

module.exports = function ajax(options) {
  return new Promise(function (resolve, reject, onCancel) {
    var optionsClone = Object.assign({}, options);
    if (optionsClone.uri.startsWith('/')) {
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
