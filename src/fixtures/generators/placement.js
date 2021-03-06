const faker = require('faker');

module.exports = ({ publisherId } = {}) => {
  const now = new Date();
  return {
    name: faker.lorem.words(10),
    createdAt: now,
    updatedAt: now,
    publisherId: publisherId(),
  };
};
