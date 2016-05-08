'use strict'
const generalTransportTest = require('./general')
const blogPostsRouter = require('../../../api/transport/blogPosts')

generalTransportTest({
  moduleName: 'blog posts',
  router: blogPostsRouter,
  basePath: '/blog',
  routes: [
    {
      path: '/',
      actions: {
        GET: 'read'
      }
    },
    {
      path: '/:postId',
      actions: {
        POST: 'create',
        GET: 'read',
        PUT: 'update',
        DELETE: 'delete'
      }
    }
  ]
})
