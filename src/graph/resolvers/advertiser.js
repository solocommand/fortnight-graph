const { paginationResolvers } = require('@limit0/mongoose-graphql-pagination');
const CampaignRepo = require('../../repositories/campaign');
const AdvertiserRepo = require('../../repositories/advertiser');
const ContactRepo = require('../../repositories/contact');
const Advertiser = require('../../models/advertiser');

module.exports = {
  /**
   *
   */
  Advertiser: {
    campaigns: advertiser => CampaignRepo.findForAdvertiser(advertiser.id),
    campaignCount: advertiser => CampaignRepo.findForAdvertiser(advertiser.id).count(),
    notify: async (advertiser) => {
      const internal = await ContactRepo.find({ _id: { $in: advertiser.notify.internal } });
      const external = await ContactRepo.find({ _id: { $in: advertiser.notify.external } });
      return { internal, external };
    },
  },

  /**
   *
   */
  AdvertiserConnection: paginationResolvers.connection,

  /**
   *
   */
  Query: {
    /**
     *
     */
    advertiser: async (root, { input }, { auth }) => {
      auth.check();
      const { id } = input;
      const record = await AdvertiserRepo.findById(id);
      if (!record) throw new Error(`No advertiser record found for ID ${id}.`);
      return record;
    },

    /**
     *
     */
    allAdvertisers: (root, { pagination, sort }, { auth }) => {
      auth.check();
      return AdvertiserRepo.paginate({ pagination, sort });
    },

    /**
     *
     */
    autocompleteAdvertisers: async (root, { pagination, phrase }, { auth }) => {
      auth.check();
      return AdvertiserRepo.autocomplete(phrase, { pagination });
    },

    /**
     *
     */
    searchAdvertisers: async (root, { pagination, phrase }, { auth }) => {
      auth.check();
      return AdvertiserRepo.search(phrase, { pagination });
    },
  },

  /**
   *
   */
  Mutation: {
    /**
     *
     */
    createAdvertiser: (root, { input }, { auth }) => {
      auth.check();
      const { payload } = input;
      return AdvertiserRepo.create(payload);
    },

    /**
     *
     */
    updateAdvertiser: (root, { input }, { auth }) => {
      auth.check();
      const { id, payload } = input;
      return AdvertiserRepo.update(id, payload);
    },

    /**
     *
     */
    addAdvertiserContact: (root, { input }, { auth }) => {
      auth.check();
      const { id, type, contactId } = input;
      return ContactRepo.addContactTo(Advertiser, id, type, contactId);
    },

    /**
     *
     */
    removeAdvertiserContact: (root, { input }, { auth }) => {
      auth.check();
      const { id, type, contactId } = input;
      return ContactRepo.removeContactFrom(Advertiser, id, type, contactId);
    },

    /**
     *
     */
    setAdvertiserContacts: (root, { input }, { auth }) => {
      auth.check();
      const { id, type, contactIds } = input;
      return ContactRepo.setContactsFor(Advertiser, id, type, contactIds);
    },
  },
};
