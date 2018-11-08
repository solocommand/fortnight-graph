const AccountService = require('../../services/account');
const { GOOGLE_SITE_VERIFICATION, GA_TRACKING_ID } = require('../../env');

module.exports = {
  /**
   *
   */
  Account: {
    id: ({ _id }) => _id,
  },
  /**
   *
   */
  AccountSettings: {
    googleAnalyticsId: () => GA_TRACKING_ID,
    siteVerificationMeta: () => GOOGLE_SITE_VERIFICATION,
  },

  /**
   *
   */
  Query: {
    account: () => AccountService.retrieve(),
  },

  /**
   *
   */
  Mutation: {
    /**
     *
     */
    updateAccount: async (root, { input }, { auth }) => {
      auth.checkAdmin();
      return AccountService.update(input);
    },
  },
};
