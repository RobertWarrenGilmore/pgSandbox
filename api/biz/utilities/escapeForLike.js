'use strict'
module.exports = function (string) {
  return string.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}
