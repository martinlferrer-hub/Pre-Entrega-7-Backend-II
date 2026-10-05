import { TicketModel } from "../models/Ticket.js";

export const ticketsDao = {
  async create(ticketData) {
    return TicketModel.create(ticketData);
  },

  async findById(id) {
    return TicketModel.findById(id);
  },

  async findActiveByUserAndEvent(userId, eventId) {
    return TicketModel.findOne({
      user: userId,
      event: eventId,
      status: { $in: ["confirmed", "pending"] }
    });
  },

  async findByUser(userId) {
    return TicketModel.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("event", "title date location")
      .lean();
  },

  async findByEvent(eventId) {
    return TicketModel.find({ event: eventId })
      .sort({ createdAt: -1 })
      .populate("user", "first_name last_name email role")
      .lean();
  },

  async sumActiveQuantityByEvent(eventId) {
    const result = await TicketModel.aggregate([
      {
        $match: {
          event: eventId,
          status: { $in: ["confirmed", "pending"] }
        }
      },
      {
        $group: {
          _id: null,
          quantity: { $sum: "$quantity" }
        }
      }
    ]);

    return result[0]?.quantity ?? 0;
  },

  async cancelById(id) {
    return TicketModel.findByIdAndUpdate(
      id,
      { status: "cancelled", cancelledAt: new Date() },
      { new: true, runValidators: true }
    );
  }
};
