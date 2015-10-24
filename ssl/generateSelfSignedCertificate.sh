# Create a secure private key.
openssl genrsa -des3 -out ssl/key.secure 2048

# Create an insecure private key from the secure one.
openssl rsa -in ssl/key.secure -out ssl/key
# TODO Generate this one without the other one.

# Create a certificate-signing request.
openssl req -new -key ssl/key -out ssl/csr
# TODO Find a way to do this without keyboard interaction.

# Create a certificate.
openssl x509 -req -days 365 -in ssl/csr -signkey ssl/key -out ssl/cert
