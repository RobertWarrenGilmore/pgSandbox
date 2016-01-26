host=$(node ssl/printHost.js)
openssl req -nodes -new -x509 -keyout ssl/privkey.pem -out ssl/fullchain.pem -subj "/CN=${host}"
