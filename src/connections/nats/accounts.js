const { ServiceBroker } = require('moleculer');
const { NATS_DSN, NATS_LOGLEVEL } = require('../../env');

const broker = new ServiceBroker({
  namespace: 'native-x',
  transporter: NATS_DSN,
  logLevel: NATS_LOGLEVEL,
  logFormatter: 'simple',
});

let init = false;

const start = async () => {
  if (!init) {
    await broker.start();
    await broker.waitForServices('account');
    init = true;
  }
};

module.exports = {
  retrieve: async (query) => {
    await start();
    return broker.call('account.retrieve', query);
  },
  update: async ({ id, payload }) => {
    await start();
    return broker.call('account.update', { id, payload });
  },
};
