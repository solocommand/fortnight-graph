const ReportingService = require('../../services/reporting');

module.exports = {
  /**
   *
   */
  Query: {
    /**
     *
     */
    reportCampaignSummary: async (root, { input }) => {
      const { hash } = input;
      return ReportingService.campaignSummary(hash);
    },
    /**
     *
     */
    reportStorySummary: async (root, { input }) => {
      const { id } = input;
      return ReportingService.storySummary(id);
    },

    /**
     *
     */
    reportCampaignCreativeBreakdown: async (root, { input }) => {
      const { hash } = input;
      return ReportingService.campaignCreativeBreakdown(hash);
    },
  },
};
