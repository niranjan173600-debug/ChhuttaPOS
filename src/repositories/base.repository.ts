/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseEntity, IRepository } from '../types';
import { db } from '../database/db';
import { Table } from 'dexie';

/**
 * BaseRepository implements the repository pattern utilizing Dexie.js for IndexedDB.
 * It provides standard CRUD features and makes swappability to SQLite straightforward
 * by keeping database-specific calls isolated to this layer.
 */
export class BaseRepository<T extends BaseEntity> implements IRepository<T> {
  protected table: Table<any, string>;

  constructor(tableName: 'userProfiles' | 'businessConfigs' | 'subscriptions') {
    this.table = db[tableName];
  }

  async getById(id: string): Promise<T | undefined> {
    try {
      return await this.table.get(id) as T | undefined;
    } catch (error) {
      console.error(`Error fetching entity ${id} from repository:`, error);
      throw error;
    }
  }

  async getAll(): Promise<T[]> {
    try {
      return await this.table.toArray() as T[];
    } catch (error) {
      console.error('Error fetching all entities from repository:', error);
      throw error;
    }
  }

  async save(entity: T): Promise<string> {
    try {
      const now = new Date().toISOString();
      const updatedEntity = {
        ...entity,
        updatedAt: now,
        createdAt: entity.createdAt || now,
      };
      await this.table.put(updatedEntity);
      return entity.id;
    } catch (error) {
      console.error('Error saving entity:', error);
      throw error;
    }
  }

  async saveMany(entities: T[]): Promise<string[]> {
    try {
      const now = new Date().toISOString();
      const prepared = entities.map(entity => ({
        ...entity,
        updatedAt: now,
        createdAt: entity.createdAt || now,
      }));
      await this.table.bulkPut(prepared);
      return entities.map(e => e.id);
    } catch (error) {
      console.error('Error saving multiple entities:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.table.delete(id);
    } catch (error) {
      console.error(`Error deleting entity ${id}:`, error);
      throw error;
    }
  }

  async query(filter: (item: T) => boolean): Promise<T[]> {
    try {
      const items = await this.getAll();
      return items.filter(filter);
    } catch (error) {
      console.error('Error querying entities:', error);
      throw error;
    }
  }
}
