import { UserModel } from "../models/User.js";

export const usersDao = {
  async findByEmail(email) {
    return UserModel.findOne({ email }).select("+password");
  },

  async create(userData) {
    return UserModel.create(userData);
  },

  async findAllSafe() {
    return UserModel.find()
      .select("first_name last_name email role createdAt updatedAt")
      .lean();
  }
};
