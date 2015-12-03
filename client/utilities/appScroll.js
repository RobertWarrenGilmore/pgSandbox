function getElements() {
  return [document, document.getElementById('appContainer').children[0]];
}
module.exports = {
  addListener: function (callback) {
    var elements = getElements();
    for (var i in elements) {
      elements[i].addEventListener('scroll', callback);
    }
  },
  removeListener: function (callback) {
    var elements = getElements();
    for (var i in elements) {
      elements[i].removeEventListener('scroll', callback);
    }
  }
};
