# This script installs Postgres, creates the user for the app, and creates the database.
echo "Enter a password for the database user:"
read dbPassword

sudo apt-get --assume-yes install postgresql postgresql-contrib
sudo -u postgres psql --command="CREATE ROLE \"adjuvet\" LOGIN PASSWORD '${dbPassword}' SUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;"
sudo -u postgres psql --command="CREATE DATABASE \"adjuvet\" WITH ENCODING='UTF8' OWNER=\"adjuvet\" CONNECTION LIMIT=-1;"
sudo -u postgres psql --command="CREATE DATABASE \"adjuvetTest\" WITH ENCODING='UTF8' OWNER=\"adjuvet\" CONNECTION LIMIT=-1;"
echo "dbPassword=${dbPassword}" >> .env
