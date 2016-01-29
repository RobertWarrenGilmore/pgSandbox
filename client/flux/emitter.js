'use strict'

module.exports = class Emitter {
  constructor() {
    this.listeners = []
  }
  emit() {
    for (let i in this.listeners) {
      this.listeners[i]()
    }
  }
  listen(listener) {
    if (this.listeners.indexOf(listener) === -1) {
      this.listeners.push(listener)
    }
  }
  unlisten(listener) {
    let i = this.listeners.indexOf(listener)
    if (i !== -1) {
      this.listeners.splice(i, 1)
    }
  }
}
