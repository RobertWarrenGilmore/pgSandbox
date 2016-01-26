require('dotenv').load();
var fs = require('fs');
var path = require('path');
var express = require('express');
var compression = require('compression');
var https = require('https');
var http = require('http');
var api = require('./api');
var browserify = require('browserify');
var reactify = require('reactify');
var uglifyify = require('uglifyify');
var sass = require('node-sass');
var knex = require('./api/database/knex');
var Promise = require('bluebird');
var forever = require('forever');
var commandLineArgs = require('command-line-args');
var app = express();

var cli = commandLineArgs([
  { name: 'replace', alias: 'r', type: String }
]);
var options = cli.parse();

app.set('x-powered-by', false);

app.use(compression({
  level: 9
}));

console.info('Getting the SSL key.');
var sslOptions = {
  key: fs.readFileSync(path.join('.', 'ssl', 'privkey.pem')),
  cert: fs.readFileSync(path.join('.', 'ssl', 'fullchain.pem'))
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

// Enforce future visits to HTTPS using the HSTS header.
app.use(function (req, res, next) {
  res.set('Strict-Transport-Security', 'max-age=15552000; includeSubDomains; preload'); // HSTS expires after 180 days.
  next();
});

// Create Browserify promise.
var b = browserify({
  debug: (process.env.NODE_ENV !== 'production')
});
b.transform(reactify);
if (process.env.NODE_ENV === 'production') {
  b.transform({
    global: true,
    ignore: [
      '**/node_modules/when/**' // TODO Find out why this library won't uglify properly.
    ]
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


console.info('Bundling scripts and styles.');
Promise.join(clientScriptPromise, clientStylePromise,
  function (clientScript, clientStyle, migrate) {

    // Link the three server-side layers together and serve them as the API.
    console.info('Routing the API.');
    app.use('/api', api);

    console.info('Routing the client.');
    app.get('/main.js', function (req, res) {
      res.type('application/javascript');
      res.send(clientScript);
    });
    app.get('/main.css', function (req, res) {
      res.type('text/css');
      res.send(clientStyle.css.toString());
    });
    app.use('/assets', express.static(path.join(__dirname, 'client', 'assets')));
    app.use('/assets/*', function (req, res) {
      res.status(404).send('There is no such asset.');
    });
    app.get('/*', function (req, res) {
      res.sendFile((path.join(__dirname, 'client', 'index.html')));
    });

    // Handle uncaught errors.
    app.use(function (err, req, res, next) {
      console.error(err.stack);
      res.status(500).send('Something broke!');
    });

    // Stop the previous instance if the command line indicates to do so.
    if (options.replace) {
      return new Promise(function (resolve, reject) {
        var emitter = forever.stop(options.replace);
        emitter.on('error', function (stopError) {
          reject(stopError);
        });
        emitter.on('stop', function () {
          resolve();
        });
      });
    }
  }).then(function () {

    // Migrate the database schema
    console.info('Migrating database schema.');
    return knex.migrate.latest();
  }).then(function () {

    http.createServer(app).listen(8000);
    https.createServer(sslOptions, app).listen(44300);
    console.info('Serving.');

  }).catch(function (err) {
    console.error(err.stack);
    process.exit(err.status || 1);
  });
