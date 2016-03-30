'use strict'
const ajax = require('../../utilities/ajax')
const store = require('../')
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')
const handleError = require('../handleError')

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
      }).then(({ statusCode, body }) => {
        if (statusCode === 200) {
          let pageMap = {
            [id]: body
          }
          dispatch(cachePages(pageMap))
        } else if (statusCode === 404) {
          dispatch(cachePages({
            [id]: null
          }))
        } else {
          handleError(body)
        }
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
      }).then(({ statusCode, body }) => {
        if (statusCode === 200) {
          dispatch(cachePages({
            [id]: body
          }))
        } else if (statusCode === 404) {
          dispatch(cachePages({
            [id]: null
          }))
        } else {
          handleError(body)
        }
      })
    }
  }
}

module.exports = creators
