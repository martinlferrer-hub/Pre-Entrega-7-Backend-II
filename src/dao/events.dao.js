import { EventModel } from "../models/Event.js";

export const eventsDao = {
  async findPublished() {
    return EventModel.find({ status: "published" })
      .select("title description category date location capacity price status organizer")
      .sort({ date: 1 })
      .lean();
  },

  async findById(id) {
    return EventModel.findById(id);
  },

  async create(eventData) {
    return EventModel.create(eventData);
  },

  async updateById(id, eventData) {
    return EventModel.findByIdAndUpdate(id, eventData, {
      new: true,
      runValidators: true
    });
  },

  async findMany(filter, { skip, limit, sort }) {
    return EventModel.find(filter)
      .select("title description category date location capacity price status organizer")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  },

  async count(filter) {
    return EventModel.countDocuments(filter);
  }
};
