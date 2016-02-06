'use strict'
const ajax = require('../../utilities/ajax')
const store = require('../')
const { createAction: createActionCreator } = require('redux-actions')
const types = require('./types')
const { search: searchUsers } = require('../users/actions')

// private action creators
const cachePosts = createActionCreator(types.CACHE_POSTS)
const setAuthorIds = createActionCreator(types.SET_AUTHOR_IDS)

// public action creators
const creators = {
  savePost(post, existingId) {
    return dispatch => {
      const auth = store.getState().auth.credentials
      const newId = existingId || post.id
      const exists = !!store.getState().blog.posts[newId]
      const method = exists ? 'PUT' : 'POST'
      const uri = '/api/blog/' + newId
      let requestBody = Object.assign({}, post)
      if (!!requestBody.id && !exists) {
        delete requestBody.id
      }
      return ajax({
        method,
        uri,
        json: true,
        auth,
        body: requestBody
      }).then(({ statusCode, body }) => {
        if (statusCode === (exists ? 200 : 201)) {
          let postMap = {
            [post.id]: body
          }
          if (existingId && (post.id !== existingId)) {
            postMap[existingId] = null
          }
          dispatch(cachePosts(postMap))
        } else if (statusCode === 404) {
          dispatch(cachePosts({
            [post.id]: null
          }))
        } else {
          throw new Error(body.message || body)
        }
      })
    }
  },
  loadPost(id) {
    return dispatch => {
      const auth = store.getState().auth.credentials
      return ajax({
        method: 'GET',
        uri: '/api/blog/' + id,
        json: true,
        auth
      }).then(({ statusCode, body }) => {
        if (statusCode === 200) {
          dispatch(cachePosts({
            [id]: body
          }))
        } else if (statusCode === 404) {
          dispatch(cachePosts({
            [id]: null
          }))
        } else {
          throw new Error(body.message || body)
        }
      })
    }
  },
  deletePost(id) {
    return dispatch => {
      const auth = store.getState().auth.credentials
      return ajax({
        method: 'DELETE',
        uri: '/api/blog/' + id,
        json: true,
        auth
      }).then(({statusCode, body }) => {
        if (statusCode === 200 || statusCode === 404) {
          dispatch(cachePosts({
            [id]: null
          }))
        } else {
          throw new Error(body.message || body)
        }
      })
    }
  },
  searchPosts(query) {
    return dispatch => {
      const auth = store.getState().auth.credentials
      return ajax({
        method: 'GET',
        uri: '/api/blog',
        auth,
        json: true,
        qs: query
      }).then(({ statusCode, body }) => {
        if (statusCode === 200) {
          let postMap = {}
          let idList = []
          body.forEach(post => {
            postMap[post.id] = post
            idList.push(post.id)
          })
          dispatch(cachePosts(postMap))
          return idList
        } else {
          throw new Error(body.message || body)
        }
      })
    }
  },
  loadAuthors() {
    return dispatch => {
      // Recursively add authors to the list until no more can be loaded.
      const loadMoreAuthors = (authorIds = []) => {
        return dispatch(searchUsers({
          authorisedToBlog: true,
          offset: authorIds.length
        })).then(ids => {
          if (ids.length) {
            // We keep adding this back into this promise chain until no more ids are returned.
            return loadMoreAuthors(authorIds.concat(ids))
          } else {
            // Base case; no more authors to add.
            dispatch(setAuthorIds(authorIds))
          }
        })
      }
      return loadMoreAuthors()
    }
  }
}

module.exports = creators
