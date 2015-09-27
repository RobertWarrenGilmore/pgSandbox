/**
 * This module requires all of the model classes so that they will be registered
 * with Bookshelf's registry plugin. Requiring this module does the same thing
 * as requiring the module '../database/bookshelf', and also allows one to get a
 * model class by, for instance, doing:
 * `var User = require('./models/bookshelf').model('User');`.
 *
 * This module should be required where model classes are needed, but not in the
 * model modules themselves. Instead, models should require
 * '../database/bookshelf'.
 */

var bookshelf = require('../database/bookshelf');

// all of the model and collection classes to register
require('./user');

module.exports = bookshelf;
