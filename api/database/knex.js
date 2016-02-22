'use strict'
const knexFile = require('./knexfile')
const configName = process.env.NODE_ENV || 'development'
const knexConfig = knexFile[configName]
const knex = require('knex')(knexConfig)

module.exports = knex
