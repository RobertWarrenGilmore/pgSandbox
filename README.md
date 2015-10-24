# pgSandbox
a first attempt at a database wrapper app over postgres

# instructions

Change the value of "appHost" in package.json to reflect the host where the app will be served.

## to install dependencies
```
npm install
```

## to set up the database
The app needs a local Postgres database named sandbox with user sandboxUser. To run the script that sets this up (on Ubuntu):
```
npm run dbSetup
```

## to run the tests
```
npm test
```

## to lint the code
```
npm run lint
```
