'use strict'
var knex = require('./database/knex')
var biz = require('./biz')
var transport = require('./transport')

module.exports = transport(biz(knex))
