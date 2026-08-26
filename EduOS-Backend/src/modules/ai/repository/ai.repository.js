import BaseRepository from '../../../shared/repositories/base.repository.js';
import prisma from '../../../config/database.config.js';

class AiRepository extends BaseRepository {
  constructor() {
    super('user', prisma); // Placeholder matching standard BaseRepository initialization
    this.prisma = prisma;
  }
}

export default new AiRepository();
