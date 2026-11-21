const { randomBytes, scryptSync } = require('node:crypto');
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16).toString('hex');
console.log('Mot de passe admin (à garder dans votre gestionnaire de mots de passe) : ' + password);
console.log('RSVP_ADMIN_PASSWORD_HASH=' + salt + ':' + scryptSync(password,salt,32).toString('hex'));
console.log('RSVP_SESSION_SECRET=' + randomBytes(32).toString('hex'));
