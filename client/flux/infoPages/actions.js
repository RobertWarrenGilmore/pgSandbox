'use strict'
const ajax = require('../../utilities/ajax')
const store = require('../')
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')
const NoSuchResourceError = require('../../../errors/noSuchResourceError')

// private action creators
const cachePages = createActionCreator(types.CACHE_PAGES)

// public action creators
const creators = {
  savePage(page, id) {
    return dispatch => {
      const auth = store.getState().auth.credentials
      return ajax({
        method: 'PUT',
        uri: '/api/infoPages/' + id,
        json: true,
        auth,
        body: page
      })
      .then(response => {
        let pageMap = {
          [id]: response
        }
        dispatch(cachePages(pageMap))
      })
      .catch(err => {
        if (err instanceof NoSuchResourceError)
          dispatch(cachePages({
            [id]: null
          }))
        else
          throw err
      })
    }
  },
  loadPage(id) {
    return dispatch => {
      const auth = store.getState().auth.credentials
      return ajax({
        method: 'GET',
        uri: '/api/infoPages/' + id,
        json: true,
        auth
      })
      .then(response => {
        dispatch(cachePages({
          [id]: response
        }))
      })
      .catch(err => {
        if (err instanceof NoSuchResourceError)
          dispatch(cachePages({
            [id]: null
          }))
        else
          throw err
      })
    }
  }
}

module.exports = creators
