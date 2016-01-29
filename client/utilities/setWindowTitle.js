'use strict'
const appName = require('../../appInfo.json').name

module.exports = function setWindowTitle (title) {
  document.title = appName
  if (title && title.length) {
    document.title += ' - ' + title
  }
}
