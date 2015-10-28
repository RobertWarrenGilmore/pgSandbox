var request = require('request');
var Promise = require('bluebird');

module.exports = function ajax(options) {
  return new Promise(function (resolve, reject) {
    var optionsClone = Object.assign({}, options);
    if (optionsClone.uri.startsWith('/')) {
      optionsClone.uri = window.location.origin + optionsClone.uri;
    }
    request(optionsClone, function (error, response, body) {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};
