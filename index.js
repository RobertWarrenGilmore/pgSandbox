require('dotenv').load();
var fs = require('fs');
var path = require('path');
var express = require('express');
var https = require('https');
var http = require('http');
var server = require('./server');
var browserify = require('browserify');
var reactify = require('reactify');
var uglifyify = require('uglifyify');
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

// Create Browserify promise.
var b = browserify({
  debug: (process.env.NODE_ENV !== 'production')
});
b.transform(reactify);
if (process.env.NODE_ENV === 'production') {
  b.transform({
    global: true
  }, uglifyify);
}
b.add('./client/main.jsx');
var clientScriptPromise = Promise.promisify(b.bundle, {
  context: b
})();

// Create Sass promise.
var sassRender = Promise.promisify(sass.render, {
  context: sass
});
var clientStylePromise = sassRender({
  file: './client/main.sass',
  outputStyle: (process.env.NODE_ENV === 'production') ? 'compressed' : 'expanded'
});

// Create database schema migration promise.
var knexMigratePromise = knex.migrate.latest();

console.info('Bundling scripts, bundling styles, and migrating database schema.');
Promise.join(clientScriptPromise, clientStylePromise, knexMigratePromise,
  function (clientScript, clientStyle, migrate) {

    // Link the three server-side layers together and serve them as the API.
    console.info('Routing the API.');
    app.use('/api', server);

    console.info('Routing the client.');
    app.get('/main.js', function (req, res) {
      res.type('application/javascript');
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
    console.error(err.stack);
    process.exit(err.status);
  });
