# This script installs Postgres, creates the user for the app, and creates the database.
echo "Enter a password for the database user:"
read dbPassword

sudo apt-get --assume-yes install postgresql postgresql-contrib
sudo -u postgres psql --command="CREATE ROLE \"sandboxUser\" LOGIN PASSWORD '${dbPassword}' NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;"
sudo -u postgres psql --command="CREATE DATABASE sandbox WITH ENCODING='UTF8' OWNER=\"sandboxUser\" CONNECTION LIMIT=-1;"
echo $dbPassword > ./server/database/dbPassword
