'use strict'
require('dotenv').load()
const appInfo = require('./appInfo')
const fs = require('fs')
const path = require('path')
const express = require('express')
const compression = require('compression')
const https = require('https')
const http = require('http')
const api = require('./api')
const browserify = require('browserify')
const sass = require('node-sass')
const knex = require('./api/database/knex')
const Promise = require('bluebird')
const forever = require('forever')
const commandLineArgs = require('command-line-args')
const app = express()

const insecurePort = 8000
const securePort = 44300

const cli = commandLineArgs([
  { name: 'replace', alias: 'r', type: String }
])
const options = cli.parse()

app.set('x-powered-by', false)

app.use(compression({
  level: 9
}))

console.info('Getting the SSL key.')
const sslOptions = {
  key: fs.readFileSync(path.join('.', 'ssl', 'privkey.pem')),
  cert: fs.readFileSync(path.join('.', 'ssl', 'fullchain.pem'))
}

console.info('Enforcing protocol, domain, and port.')
app.use(function enforceSsl(req, res, next) {
  const correctUrl = 'https://' +
    appInfo.host + (
      (process.env.NODE_ENV !== 'production') ?
        (':' + securePort) :
        ''
    ) +
    req.url
  const actualUrl = (req.secure ? 'https' : 'http') + '://' +
    req.headers.host +
    req.originalUrl
  if (actualUrl === correctUrl) {
    next()
  } else {
    res.redirect(correctUrl)
  }
})

// Enforce future visits to HTTPS using the HSTS header.
app.use(function (req, res, next) {
  res.set('Strict-Transport-Security', 'max-age=15552000 includeSubDomains preload') // HSTS expires after 180 days.
  next()
})

// Create Browserify promise.
const b = browserify({
  debug: (process.env.NODE_ENV !== 'production')
})
b.transform('babelify', {
  presets: [
    'es2015',
    'stage-0',
    'react'
  ],
  sourceMaps: (process.env.NODE_ENV !== 'production')
})
if (process.env.NODE_ENV === 'production') {
  b.transform('uglifyify', {
    global: true
  })
}
b.add('./client/main.jsx')
const clientScriptPromise = Promise.promisify(b.bundle, {
  context: b
})()

// Create Sass promise.
const sassRender = Promise.promisify(sass.render, {
  context: sass
})
const clientStylePromise = sassRender({
  file: './client/main.sass',
  outputStyle: (process.env.NODE_ENV === 'production') ? 'compressed' : 'expanded'
})


console.info('Bundling scripts and styles.')
Promise.join(clientScriptPromise, clientStylePromise,
  (clientScript, clientStyle, migrate) => {

    // Link the three server-side layers together and serve them as the API.
    console.info('Routing the API.')
    app.use('/api', api)

    console.info('Routing the client.')
    app.get('/main.js', function (req, res) {
      res.type('application/javascript')
      res.send(clientScript)
    })
    app.get('/main.css', function (req, res) {
      res.type('text/css')
      res.send(clientStyle.css.toString())
    })
    app.use('/assets', express.static(path.join(__dirname, 'client', 'assets')))
    app.use('/assets/*', function (req, res) {
      res.status(404).send('There is no such asset.')
    })
    app.get('/*', function (req, res) {
      res.sendFile((path.join(__dirname, 'client', 'index.html')))
    })

    // Handle uncaught errors.
    app.use(function (err, req, res, next) {
      console.error(err.stack)
      res.status(500).send('Something broke!')
    })

    // Stop the previous instance if the command line indicates to do so.
    if (options.replace) {
      return new Promise((resolve, reject) => {
        const emitter = forever.stop(options.replace)
        emitter.on('error', stopError => reject(stopError))
        emitter.on('stop', () => resolve())
      })
    }
  })
  .then(() => {

    // Migrate the database schema
    console.info('Migrating database schema.')
    return knex.migrate.latest()
  })
  .then(() => {

    http.createServer(app).listen(insecurePort)
    https.createServer(sslOptions, app).listen(securePort)
    console.info('Serving.')

  })
  .catch(err => {
    console.error(err.stack)
    process.exit(err.status || 1)
  })
