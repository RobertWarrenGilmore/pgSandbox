'use strict'
var forever = require('forever')
var appName = require('./appInfo.json').name

// Get a list of currently running Forever processes.
forever.list(false, function (listError, instances) {
  if (listError) {
    console.log(listError)
    process.exit(1)
  } else {

    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    var length = 30

    // Find the process that is the previously run instance of the app.
    var previousAppInstance
    for (var i in instances) {
      var instance = instances[i]
      if (instance.uid.match(new RegExp('^' + appName + '_[' + possible + ']{' + length + '}$'))) {
        previousAppInstance = instance.uid
        break
      }
    }


    // Generate a random alphanumeric id of length 30 for the new instance.
    var currentAppInstance
    do {
      var key = []
      for (var i = 0; i < length; ++i) {
        key.push(possible.charAt(Math.floor(Math.random() * possible.length)))
      }
      currentAppInstance = appName + '_' + key.join('')
    } while (currentAppInstance === previousAppInstance)

    // Start the app, using the command line argument to tell it to stop the previous instance.
    var args
    if (previousAppInstance) {
      args = ['--replace', previousAppInstance]
    }
    forever.startDaemon('index.js', {
      uid: currentAppInstance,
      args: args
    }).on('error', function (startError) {
      console.error(startError)
      process.exit(1)
    })
  }
})
