const mongoose = require('mongoose');
const bluebird = require('bluebird');
const env = require('../../env');

const {
  MONGO_DSN,
  MONGOOSE_DEBUG,
  ACCOUNT_KEY,
  ADMIN_EMAIL,
  ADMIN_HASH,
} = env;
mongoose.set('debug', Boolean(MONGOOSE_DEBUG));
mongoose.Promise = bluebird;

const instanceDSN = MONGO_DSN.replace('/fortnight', `/fortnight-${ACCOUNT_KEY}`);

const connection = mongoose.createConnection(instanceDSN, {
  ignoreUndefined: true,
  promiseLibrary: bluebird,
});
connection.once('open', () => {
  process.stdout.write(`🛢️ 🛢️ 🛢️ Successful INSTANCE MongoDB connection to '${instanceDSN}'\n`);
  const email = ADMIN_EMAIL;
  const password = ADMIN_HASH;
  connection.model('user').findOneAndUpdate({ email }, {
    $setOnInsert: {
      email,
      role: 'Admin',
      givenName: 'Endeavor',
      familyName: 'Developer',
    },
    $set: {
      password,
    },
  }, {
    upsert: true,
    setDefaultsOnInsert: true,
  }, (err) => {
    if (err) throw err;
    process.stdout.write('🔑 🔑 🔑 Successfully updated developer account\n');
  });
});
module.exports = connection;
