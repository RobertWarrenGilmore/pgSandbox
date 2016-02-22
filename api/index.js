'use strict'
const knex = require('./database/knex')
const biz = require('./biz')
const transport = require('./transport')

module.exports = transport(biz(knex))
