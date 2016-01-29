'use strict'
function getElements() {
  return [document, document.getElementById('appContainer').children[0]]
}

module.exports = {
  addListener: function (callback) {
    let elements = getElements()
    for (const i in elements) {
      elements[i].addEventListener('scroll', callback)
    }
  },
  removeListener: function (callback) {
    const elements = getElements()
    for (const i in elements) {
      elements[i].removeEventListener('scroll', callback)
    }
  }
}
