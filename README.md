# pgSandbox
a first attempt at a database wrapper app over postgres

# instructions

Change the values in appInfo.json. `host` should reflect the host where the app will be served and `name` should reflect the display name of the application. Also add a line `sparkPostApiKey=thisIsYourKey`, substituting your SparkPost API key, to the file .env, creating such a file if it doesn't exist.

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

## to install dependencies
```
npm install
```

## to set up the database
The app needs a local Postgres database named sandbox with user sandboxUser. To run the script that sets this up (including installing Postgres on Ubuntu):
```
npm run dbSetup
```

## to create an SSL key and a self-signed certificate
```
npm run cert
```

## to run the tests
```
npm test
```

## to lint the code
```
npm run lint
```
