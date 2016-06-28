'use strict'
function getElements() {
  return [document, document.getElementById('appContainer').children[0]]
}

module.exports = {
  addListener: callback => {
    const elements = getElements()
    for (const i in elements) {
      elements[i].addEventListener('scroll', callback)
    }
  },
  removeListener: callback => {
    const elements = getElements()
    for (const i in elements) {
      elements[i].removeEventListener('scroll', callback)
    }
  }
}
