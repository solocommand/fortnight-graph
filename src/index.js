require('./newrelic');

const { PORT } = require('./env');
const { name, version } = require('../package.json');
const { app } = require('./server');
const AccountService = require('./services/account');

const start = async () => {
  await AccountService.retrieve();
  const server = app.listen(PORT);
  process.stdout.write(`🕸️ 🕸️ 🕸️ Express app '${name}:v${version}' listening on port ${PORT}\n`);
  return server;
};

start().catch(e => setImmediate(() => {
  throw e;
}));
