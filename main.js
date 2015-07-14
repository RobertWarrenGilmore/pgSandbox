// If we haven't set the environment variable for the database password yet, do so now.
if (!process.env.sandboxDbPassword) {
  var prompt = require('sync-prompt').prompt;
  process.env.sandboxDbPassword = prompt.hidden('Enter the database password. :');
}

var models = require('./models.js');
