var fs = require('fs');
var path = require('path');
var express = require('express');
var https = require('https');
var http = require('http');

var server = require('./server');

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

// Serve the client resources.
app.use('/', express.static('./client/built'));

// Get the SSL key.
var sslOptions = {
  key: fs.readFileSync(path.join('.', 'ssl', 'key')),
  cert: fs.readFileSync(path.join('.', 'ssl', 'cert'))
};

http.createServer(app).listen(80);
https.createServer(sslOptions, app).listen(443);

console.info('Serving.');
