import { eventsDao } from "../dao/events.dao.js";

export const eventsRepository = {
  async getPublished() {
    return eventsDao.findPublished();
  },

  async findById(id) {
    return eventsDao.findById(id);
  },

  async create(eventData) {
    return eventsDao.create(eventData);
  },

  async updateById(id, eventData) {
    return eventsDao.updateById(id, eventData);
  },

  async findMany(filter, pagination) {
    return eventsDao.findMany(filter, pagination);
  },

  async count(filter) {
    return eventsDao.count(filter);
  }
};
