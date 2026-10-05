import { ticketsDao } from "../dao/tickets.dao.js";

export const ticketsRepository = {
  async create(ticketData) {
    return ticketsDao.create(ticketData);
  },

  async findById(id) {
    return ticketsDao.findById(id);
  },

  async findActiveByUserAndEvent(userId, eventId) {
    return ticketsDao.findActiveByUserAndEvent(userId, eventId);
  },

  async findByUser(userId) {
    return ticketsDao.findByUser(userId);
  },

  async findByEvent(eventId) {
    return ticketsDao.findByEvent(eventId);
  },

  async sumActiveQuantityByEvent(eventId) {
    return ticketsDao.sumActiveQuantityByEvent(eventId);
  },

  async cancelById(id) {
    return ticketsDao.cancelById(id);
  }
};
