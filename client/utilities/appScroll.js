'use strict'
function getElements() {
  return [document, document.getElementById('appContainer').children[0]]
}
export default {
  addListener: function (callback) {
    let elements = getElements()
    for (var i in elements) {
      elements[i].addEventListener('scroll', callback)
    }
  },
  removeListener: function (callback) {
    var elements = getElements()
    for (var i in elements) {
      elements[i].removeEventListener('scroll', callback)
    }
  }
}
