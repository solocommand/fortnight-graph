const objectPath = require('object-path');
const Account = require('../connections/nats/accounts');
const env = require('../env');

module.exports = {
  /**
   * Retrieves the account from the database using its key.
   */
  async retrieve() {
    const key = this.getKey();
    if (!key) throw new Error('Unable to retrieve account: no account key was set.');
    const account = await Account.retrieve({ key });
    if (!account) throw new Error(`No account found for key '${key}'`);
    return account;
  },

  /**
   * Updates a subset of key values on the account
   */
  async update({ id, payload }) {
    return Account.update({ id, payload });
  },

  /**
   * Retrieves an account setting.
   *
   * @param {string} path A dot-notated object path/key.
   */
  async setting(path) {
    const account = await this.retrieve();
    const { settings } = account;
    return objectPath.get(settings, path);
  },

  /**
   * Gets the account key.
   */
  getKey() {
    const { ACCOUNT_KEY } = env;
    return ACCOUNT_KEY;
  },
};
