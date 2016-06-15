'use strict'
const moment = require('moment-timezone')
const { handleActions } = require('redux-actions')
const types = require('./types')

const initialState = moment.tz.guess()

const reducer = handleActions({
  [types.SET_TIME_ZONE]: (state = initialState, action) => {
    const timeZoneName = action.payload
    const timeZone = (moment.tz.zone(timeZoneName) || moment.tz.guess()).name
    return timeZone
  }
}, initialState)

module.exports = reducer
