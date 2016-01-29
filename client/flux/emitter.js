'use strict'
function Emitter() {
  this.listeners = []
}

Emitter.prototype = {
  emit: function () {
    for (var i in this.listeners) {
      this.listeners[i]()
    }
  },
  listen: function (listener) {
    if (this.listeners.indexOf(listener) === -1) {
      this.listeners.push(listener)
    }
  },
  unlisten: function (listener) {
    var i = this.listeners.indexOf(listener)
    if (i !== -1) {
      this.listeners.splice(i, 1)
    }
  }
}

module.exports = Emitter
