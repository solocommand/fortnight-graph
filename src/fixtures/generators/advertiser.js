const faker = require('faker');

module.exports = ({ internalContactIds = [], externalContactIds = [] }) => {
  const now = new Date();

  return {
    name: faker.lorem.words(10),
    logo: faker.image.imageUrl(100, 100, undefined, undefined, true),
    createdAt: now,
    updatedAt: now,
    notify: {
      internal: internalContactIds,
      external: externalContactIds,
    },
  };
};
