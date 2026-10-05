import { usersRepository } from "../repositories/users.repository.js";

export const usersService = {
  async getAllUsers() {
    return usersRepository.findAllSafe();
  }
};
