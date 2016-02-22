'use strict'
module.exports = res =>
  function handleError(err) {
    if (err.messages) {
      res.status(400).send({
        messages: err.messages,
        message: err.message
      })
    } else {
      res.status(err.errorCode || 500).send(err.message)
    }
  }
