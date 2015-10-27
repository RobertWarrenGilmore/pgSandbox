var request = require('request');
var Promise = require('bluebird');

module.exports = function ajax(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (error, response, body) {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};
