# Save the current git HEAD so that we can revert to it if needed.
oldHEAD=$(git rev-parse --verify HEAD^{commit}) && (

  # Upgrade to the new version of the app.
  (
    git pull origin master &&
    npm install &&
    npm prune &&
    npm test &&
    npm start
  ) ||

  # If the upgrade fails, then revert to the previous commit.
  (
    git checkout $oldHEAD &&
    git branch -f master $oldHEAD &&
    git checkout master &&
    npm install &&
    npm prune &&
    npm test &&
    npm start
  )
)
