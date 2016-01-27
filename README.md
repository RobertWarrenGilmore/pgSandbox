# genericNodeReactApp

[![Join the chat at https://gitter.im/RobertWarrenGilmore/pgSandbox](https://badges.gitter.im/RobertWarrenGilmore/pgSandbox.svg)](https://gitter.im/RobertWarrenGilmore/pgSandbox?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

a simple web app with auth, info pages, a blog, and admins

# instructions

Change the values in appInfo.json. `host` should reflect the host where the app will be served and `name` should reflect the display name of the application. Also add the following lines to a file named .env:

- `sparkPostApiKey=thisIsYourKey`, substituting your SparkPost API key
- `NODE_ENV=production`, or `NODE_ENV=development` if you're not in production
- `reportEmail=your@emailaddress.com`, substituting an email address suitable for error reports
- `dbPassword=yourPasswordHere`, substituting the password for your database. This line will be added automatically if you run `npm run dbSetup`, as described later in this readme.

## to install Node and NPM
I recommend that you manage Node/NPM versions using NVM. Install it like so:
```
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.29.0/install.sh | bash
```
After you've installed NVM, you'll need to start a new shell in order to use it. you can either close and reopen your shell or start a new one, like so:
```
bash
```
Next, use NVM to install the version of Node and NPM specified for the project.
```
nvm install
```
Use NVM to load Node and NPM into your PATH so that you can run Node and NPM commands. You'll need to do this in each new shell.
```
nvm use
```

## to lint the code
```
npm run lint
```

## to set up the database
The app needs a local Postgres database named sandbox with user sandboxUser. To run the script that sets this up (including installing Postgres on Ubuntu):
```
npm run dbSetup
```

## to route the ports
The app serves on ports 8000 and 44300. Those ports need to be exposed as 80 and 443. To do that:
```
npm run openPorts
```

## to create an SSL key and a self-signed certificate
```
npm run cert
```

## to install dependencies
```
npm install
```

## to run the tests
```
npm test
```

## to run the application
This will run the application synchronously.
```
node index.js
```
Alternatively, this will run the application and free the current shell.
```
npm start
```
This will stop the app if it's running in the background.
```
npm stop
```

## for quick deployment
To deploy the app quickly,
```
npm run deploy
```
You must first have access to Node and NPM in the shell, have an SSL certificate, and have routed the ports. This script will take care of pulling down the latest version from the repository, updating the dependencies, running the tests, and starting the app in the background. If any of those steps fails, the script will revert the app to the commit it was on before, update the dependencies again, and then start the app again.
