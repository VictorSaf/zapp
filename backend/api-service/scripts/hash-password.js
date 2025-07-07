const bcrypt = require('bcrypt');

const password = 'Admin123!';
const rounds = 12;

bcrypt.hash(password, rounds, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL Update:');
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = 'admin@zaeus.ai';`);
});