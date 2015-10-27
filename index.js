var fs = require('fs');
var path = require('path');
var express = require('express');
var https = require('https');
var http = require('http');
var server = require('./server');
var browserify = require('browserify');
var reactify = require('reactify');
var Promise = require('bluebird');
var app = express();

app.set('x-powered-by', false);

// Redirect insecure to secure.
app.use(function enforceSsl(req, res, next) {
  if (req.secure) {
    next();
  } else {
    res.redirect('https://' + req.headers.host + req.url);
  }
});

// Link the three server-side layers together and serve them as the API.
app.use('/api', server);

// Build the client resources.
var b = browserify({
  debug: (process.env.NODE_ENV !== 'production')
});
b.transform(reactify);
b.add('./client/main.jsx');
Promise.promisify(b.bundle, b)()
  .then(function (clientScript) {

    // Serve the client resources.
    app.get('/main.js', function (req, res) {
      res.send(clientScript);
    });
    app.get('/', function (req, res) {
      res.sendFile((path.join(__dirname, 'client', 'index.html')));
    });

    // Get the SSL key.
    var sslOptions = {
      key: fs.readFileSync(path.join('.', 'ssl', 'key')),
      cert: fs.readFileSync(path.join('.', 'ssl', 'cert'))
    };

    http.createServer(app).listen(80);
    https.createServer(sslOptions, app).listen(443);

    console.info('Serving.');
  });
