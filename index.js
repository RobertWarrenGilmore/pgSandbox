'use strict'
require('dotenv').load()
const appInfo = require('./appInfo')
const fs = require('fs')
const path = require('path')
const express = require('express')
const compression = require('compression')
const https = require('spdy')
const http = require('http')
const api = require('./api')
const browserify = require('browserify')
const sass = require('node-sass')
const knex = require('./api/database/knex')
const forever = require('forever')
const commandLineArgs = require('command-line-args')
const LEX = require('letsencrypt-express')
const emailer = require('./utilities/emailer')
let app = express()

const allowedDomains = [appInfo.host]
// Add the naked domain if the default subdomain is www.
const wwwMatch = appInfo.host.match(/^www\.(.*)$/)
if (wwwMatch)
  allowedDomains.unshift(wwwMatch[1])

const insecurePort = 8000
const securePort = 44300

const cli = commandLineArgs([
  { name: 'replace', alias: 'r', type: String }
])
const options = cli.parse()

const isProductionMode = process.env.NODE_ENV === 'production'

app.set('x-powered-by', false)

app.use(compression({
  level: 9
}))

console.info('Enforcing protocol, domain, and port.')
app.use((req, res, next) => {
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
  if (actualUrl === correctUrl)
    next()
  else
    res.redirect(correctUrl)
})

// Enforce future visits to HTTPS using the HSTS header.
app.use((req, res, next) => {
  res.set('Strict-Transport-Security', 'max-age=2592000 includeSubDomains') // HSTS expires after 30 days.
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
  sourceMaps: (process.env.NODE_ENV !== 'production'),
  plugins: [
    ['babel-plugin-transform-builtin-extend', {
      globals: ['Error', 'Array'],
      approximate: true
    }]
  ]
})
if (isProductionMode) {
  b.transform('uglifyify', {
    global: true
  })
}
b.add('./client/main.jsx')
const clientScriptPromise = new Promise((resolve, reject) => {
  b.bundle((err, result) => {
    if (err)
      reject(err)
    else
      resolve(result)
  })
})
// Create Sass promise.
const clientStylePromise = new Promise((resolve, reject) => {
  sass.render({
    file: './client/main.sass',
    outputStyle: (isProductionMode) ? 'compressed' : 'expanded'
  }, (err, result) => {
    if (err)
      reject(err)
    else
      resolve(result)
  })
})


console.info('Bundling scripts and styles.')
Promise.all([clientScriptPromise, clientStylePromise])
  .then(([clientScript, clientStyle]) => {

    // Link the three server-side layers together and serve them as the API.
    console.info('Routing the API.')
    app.use('/api', api)

    console.info('Routing the client.')
    app.get('/main.js', (req, res) => {
      res.type('application/javascript')
      res.set('cache-control', `public, max-age=${24 * 60 * 60}`)
      res.send(clientScript)
    })
    app.get('/main.css', (req, res) => {
      res.type('text/css')
      res.set('cache-control', `public, max-age=${24 * 60 * 60}`)
      res.send(clientStyle.css.toString())
    })
    app.use('/assets', express.static(path.join(__dirname, 'client', 'assets'), {
      maxAge: 24 * 60 * 60 * 1000
    }))
    app.use('/assets/*', (req, res) => {
      res.status(404).send('There is no such asset.')
    })
    app.get('/*', (req, res) => {
      res.sendFile((path.join(__dirname, 'client', 'index.html')), {
        maxAge: 24 * 60 * 60 * 1000
      })
    })

    // Handle uncaught errors.
    app.use((err, req, res, next) => {
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

    let sslOptions
    if (isProductionMode) {
      const lex = LEX.create({
        configDir: path.join('.', 'ssl', 'letsencrypt'),
        onRequest: app,
        approveRegistration: (hostName, cb) => {
          if (allowedDomains.indexOf(hostName) !== -1) {
            cb(null, {
              domains: [hostName],
              email: process.env.reportEmail,
              agreeTos: true
            })
          }
        },
        handleRenewFailure: (err, letsencrypt, hostname, certInfo) => {
          console.error(err.stack)
          emailer(
            process.env.reportEmail,
            'Let\'s Encrypt renewal error on ' + appInfo.name,
            'The error was as follows:\n' + err.stack +
              '\n\n The hostname was ' + hostname + '.' +
              '\n\n The certInfo was ' + certInfo + '.'
          )
        }
      })
      sslOptions = lex.httpsOptions
      app = LEX.createAcmeResponder(lex, app)
    } else {
      console.info('Getting the SSL key.')
      sslOptions = {
        key: fs.readFileSync(path.join('.', 'ssl', 'privkey.pem')),
        cert: fs.readFileSync(path.join('.', 'ssl', 'fullchain.pem'))
      }
    }

    http.createServer(app).listen(insecurePort)
    https.createServer(sslOptions, app).listen(securePort)
    console.info('Serving.')

  })
  .catch(err => {
    console.error(err.stack)
    process.exit(err.status || 1)
  })
