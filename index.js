var fs = require('fs');
var path = require('path');
var express = require('express');
var https = require('https');
var http = require('http');
var server = require('./server');
var browserify = require('browserify');
var reactify = require('reactify');
var sass = require('node-sass');
var knex = require('./server/database/knex');
var Promise = require('bluebird');
var app = express();

app.set('x-powered-by', false);

console.info('Getting the SSL key.');
var sslOptions = {
  key: fs.readFileSync(path.join('.', 'ssl', 'key')),
  cert: fs.readFileSync(path.join('.', 'ssl', 'cert'))
};

// Redirect insecure to secure.
console.info('Enforcing SSL.');
app.use(function enforceSsl(req, res, next) {
  if (req.secure) {
    next();
  } else {
    res.redirect('https://' + req.headers.host + req.url);
  }
});

console.info('Migrating the database schema.');
knex.migrate.latest()
  .then(function () {

    console.info('Compiling client-side JS.');
    var b = browserify({
      debug: (process.env.NODE_ENV !== 'production')
    });
    b.transform(reactify);
    b.add('./client/main.jsx');
    var bundlePromise = Promise.promisify(b.bundle, b)();
    return bundlePromise;
  })
  .then(function (clientScript) {
    console.info('Compiling Sass.');
    var clientStyle = sass.renderSync({
      file: './client/main.sass',
      outputStyle: (process.env.NODE_ENV === 'production') ? 'compressed' : 'expanded'
    });

    // Link the three server-side layers together and serve them as the API.
    console.info('Routing the API.');
    app.use('/api', server);

    console.info('Routing the client.');
    app.get('/main.js', function (req, res) {
      res.send(clientScript);
    });
    app.get('/main.css', function (req, res) {
      res.type('text/css');
      res.send(clientStyle.css.toString());
    });
    app.get('/*', function (req, res) {
      res.sendFile((path.join(__dirname, 'client', 'index.html')));
    });

    // Handle uncaught errors.
    app.use(function (err, req, res, next) {
      console.error(err.stack);
      res.status(500).send('Something broke!');
    });

    http.createServer(app).listen(80);
    https.createServer(sslOptions, app).listen(443);

    console.info('Serving.');
  })
  .catch(function (err) {
    throw err;
  });
