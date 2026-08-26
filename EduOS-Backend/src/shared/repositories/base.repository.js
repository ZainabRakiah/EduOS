export class BaseRepository {
  constructor(model, prisma) {
    this.model = model;
    this.prisma = prisma;
  }
}

export default BaseRepository;
