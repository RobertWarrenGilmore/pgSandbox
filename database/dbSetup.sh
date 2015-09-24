# This script runs on npm postinstall. It installs Postgres, creates the user for the app, and creates the database.

# TODO Perhaps this script should not run on npm postinstall.

apt-get --assume-yes install postgresql postgresql-contrib
password=$(date +%s | sha256sum | base64 | head -c 32)
sudo -u postgres psql --command="CREATE ROLE \"sandboxUser\" LOGIN PASSWORD '${password}' NOSUPERUSER INHERIT NOCREATEDB NOCREATEROLE NOREPLICATION; CREATE DATABASE sandbox WITH ENCODING='UTF8' OWNER=\"sandboxUser\" CONNECTION LIMIT=-1;"
echo $password > dbPassword
