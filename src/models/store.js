// Resilient In-Memory & File Store for zero-setup execution when MongoDB is not running
const { getStatus } = require('../config/db');

class MemoryCollection {
  constructor(name) {
    this.name = name;
    this.items = [];
  }

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _matches(item, filter) {
    if (!filter) return true;
    for (const key in filter) {
      if (key === '$or') {
        const matchesOr = filter.$or.some(subFilter => this._matches(item, subFilter));
        if (!matchesOr) return false;
        continue;
      }
      if (item[key] === undefined && filter[key] !== undefined) return false;
      if (item[key] !== filter[key]) {
        // Support MongoDB-like ObjectId comparison or string equivalence
        if (String(item[key]) !== String(filter[key])) {
          return false;
        }
      }
    }
    return true;
  }

  async find(filter = {}) {
    let result = this.items.filter(item => this._matches(item, filter)).map(this._clone);
    return {
      sort: (sortObj = {}) => {
        result.sort((a, b) => {
          for (const key in sortObj) {
            const dir = sortObj[key];
            if (a[key] < b[key]) return -1 * dir;
            if (a[key] > b[key]) return 1 * dir;
          }
          return 0;
        });
        return {
          limit: (n) => Promise.resolve(result.slice(0, n)),
          then: (resolve) => resolve(result)
        };
      },
      limit: (n) => Promise.resolve(result.slice(0, n)),
      then: (resolve) => resolve(result)
    };
  }

  async findOne(filter = {}) {
    const item = this.items.find(item => this._matches(item, filter));
    return item ? this._clone(item) : null;
  }

  async findById(id) {
    return this.findOne({ _id: id });
  }

  async create(doc) {
    const _id = doc._id || 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    const now = new Date();
    const newDoc = {
      _id,
      ...doc,
      createdAt: doc.createdAt || now,
      updatedAt: doc.updatedAt || now
    };
    this.items.push(newDoc);
    return this._clone(newDoc);
  }

  async findByIdAndUpdate(id, update, options = { new: true }) {
    const index = this.items.findIndex(item => String(item._id) === String(id));
    if (index === -1) return null;
    
    const current = this.items[index];
    const updated = {
      ...current,
      ...(update.$set || update),
      updatedAt: new Date()
    };
    this.items[index] = updated;
    return this._clone(updated);
  }

  async findOneAndUpdate(filter, update, options = { new: true, upsert: false }) {
    const item = await this.findOne(filter);
    if (!item) {
      if (options.upsert) {
        return this.create({ ...filter, ...(update.$set || update) });
      }
      return null;
    }
    return this.findByIdAndUpdate(item._id, update, options);
  }

  async deleteOne(filter) {
    const index = this.items.findIndex(item => this._matches(item, filter));
    if (index !== -1) {
      this.items.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter = {}) {
    const initialLen = this.items.length;
    this.items = this.items.filter(item => !this._matches(item, filter));
    return { deletedCount: initialLen - this.items.length };
  }

  async countDocuments(filter = {}) {
    return this.items.filter(item => this._matches(item, filter)).length;
  }
}

const memoryCollections = {};

const getCollection = (name) => {
  if (!memoryCollections[name]) {
    memoryCollections[name] = new MemoryCollection(name);
  }
  return memoryCollections[name];
};

module.exports = {
  getCollection,
  getStatus
};
