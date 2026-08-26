export class BaseService {
  constructor(repository) {
    this.repository = repository;
  }

  async create(data) {
    return this.repository.create(data);
  }

  async findById(id) {
    return this.repository.findById(id);
  }

  async findOne(filters) {
    return this.repository.findOne(filters);
  }

  async findAll(filters = {}, options = {}) {
    return this.repository.findAll(filters, options);
  }

  async update(id, data) {
    return this.repository.update(id, data);
  }

  async delete(id) {
    return this.repository.delete(id);
  }
}

export default BaseService;
