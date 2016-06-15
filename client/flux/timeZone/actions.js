'use strict'
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')

// public action creators
const creators = {
  setTimeZone: createActionCreator(types.SET_TIME_ZONE)
}

module.exports = creators
