'use strict'
const ajax = require('../../utilities/ajax')
const store = require('../')
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')
const handleError = require('../handleError')

// private action creators
const setAuthBusy = createActionCreator(types.SET_AUTH_BUSY, (arg) => arg !== false)
const setAuthCredentials = createActionCreator(types.SET_AUTH_CREDENTIALS)
const { load: loadUser } = require('../users/actions')
const { setTimeZone } = require('../timeZone/actions')

// public action creators
const creators = {
  resume() {
    return dispatch => {
      if (!store.getState().auth.busy) {
        if (localStorage.auth) {
          const credentials = JSON.parse(localStorage.auth)
          return dispatch(creators.logIn(credentials))
        } else {
          dispatch(setAuthCredentials({
            credentials: null,
            id: null
          }))
          return Promise.resolve()
        }
      }
    }
  },
  logIn(credentials) {
    return dispatch => {
      if (!store.getState().auth.busy) {
        let newId
        dispatch(setAuthCredentials({
          credentials: null,
          id: null
        }))
        dispatch(setAuthBusy(true))
        return ajax({
          method: 'GET',
          uri: '/api/auth',
          json: true,
          auth: credentials
        })
        .then(({ statusCode, body }) => {
          if (statusCode === 200) {
            dispatch(setAuthCredentials({
              credentials,
              id: body.id
            }))
            newId = body.id
          } else {
            handleError(body)
          }
        })
        // Cache the new user.
        .then(() => dispatch(loadUser(newId)))

        // Clear the auth on failure.
        .catch(err => {
          dispatch(setAuthCredentials({
            credentials: null,
            id: null
          }))
          return err
        })
        .then(err => {

          // Set the time zone.
          if (store.getState().auth.credentials) {
            dispatch(setTimeZone(store.getState().users.cache[newId].timeZone))
          } else {
            dispatch(setTimeZone(null))
          }

          dispatch(setAuthBusy(false))

          if (err)
            throw err
        })
      } else {
        return Promise.resolve()
      }
    }
  },
  logOut() {
    return dispatch => {
      if (!store.getState().auth.busy) {
        dispatch(setAuthCredentials({
          credentials: null,
          id: null
        }))
        dispatch(setTimeZone(null))
      }
    }
  }
}

module.exports = creators
