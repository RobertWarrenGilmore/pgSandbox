# Install Postgres.
apt-get --assume-yes install postgresql postgresql-contrib

# Set up the database.
cat dbSetup.sql | sudo -u postgres psql

# Set and store a new password for the the sandbox user.
password=$(date +%s | sha256sum | base64 | head -c 32)
sudo -u postgres psql --command="ALTER ROLE \"sandboxUser\" PASSWORD '${password}';"
echo $password > dbPassword
