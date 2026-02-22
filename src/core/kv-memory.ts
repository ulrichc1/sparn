/**
 * KV Memory Store Module
 * Implements hippocampal key-value storage with dual index/value tables.
 * Maps to: Hippocampal Key-Value — the hippocampus separates what to store from how to retrieve it.
 */

import { copyFileSync, existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import type { MemoryEntry, MemoryQueryFilters } from '../types/memory.js';

/**
 * Optimization statistics record.
 */
export interface OptimizationStats {
  id: number;
  timestamp: number;
  tokens_before: number;
  tokens_after: number;
  entries_pruned: number;
  duration_ms: number;
}

/**
 * KV Memory interface.
 */
export interface KVMemory {
  /** Store a memory entry */
  put(entry: MemoryEntry): Promise<void>;

  /** Retrieve a memory entry by ID */
  get(id: string): Promise<MemoryEntry | null>;

  /** Query entries by filters */
  query(filters: MemoryQueryFilters): Promise<MemoryEntry[]>;

  /** Delete a memory entry */
  delete(id: string): Promise<void>;

  /** List all entry IDs */
  list(): Promise<string[]>;

  /** Compact database (remove expired entries) */
  compact(): Promise<number>;

  /** Close database connection */
  close(): Promise<void>;

  /** Record optimization statistics */
  recordOptimization(stats: Omit<OptimizationStats, 'id'>): Promise<void>;

  /** Get all optimization statistics */
  getOptimizationStats(): Promise<OptimizationStats[]>;

  /** Clear all optimization statistics */
  clearOptimizationStats(): Promise<void>;
}

/**
 * Create a timestamped backup of the database
 * @param dbPath - Path to database file
 * @returns Path to backup file
 */
function createBackup(dbPath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbPath}.backup-${timestamp}`;

  try {
    copyFileSync(dbPath, backupPath);
    console.log(`✓ Database backed up to: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`Warning: Could not create backup: ${error}`);
    return '';
  }
}

/**
 * Create KV Memory store with SQLite backend.
 *
 * Initializes database with dual table schema:
 * - entries_index: Fast lookups (id, hash, timestamp, score, ttl, state, accessCount, isBTSP)
 * - entries_value: Content storage (id, content, tags, metadata)
 *
 * @param dbPath - Path to SQLite database file
 * @returns KVMemory instance
 */
export async function createKVMemory(dbPath: string): Promise<KVMemory> {
  // Detect database corruption and create backup
  let db: Database.Database;
  try {
    db = new Database(dbPath);

    // Quick integrity check
    const integrityCheck = db.pragma('quick_check', { simple: true });
    if (integrityCheck !== 'ok') {
      console.error('⚠ Database corruption detected!');

      // Create backup before attempting recovery
      if (existsSync(dbPath)) {
        const backupPath = createBackup(dbPath);
        if (backupPath) {
          console.log(`Backup created at: ${backupPath}`);
        }
      }

      // Try to recover
      console.log('Attempting database recovery...');
      db.close();
      db = new Database(dbPath);
    }
  } catch (error) {
    console.error('⚠ Database error detected:', error);

    // Create backup if database exists
    if (existsSync(dbPath)) {
      createBackup(dbPath);
      console.log('Creating new database...');
    }

    db = new Database(dbPath);
  }

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Create entries_index table
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries_index (
      id TEXT PRIMARY KEY NOT NULL,
      hash TEXT UNIQUE NOT NULL,
      timestamp INTEGER NOT NULL,
      score REAL NOT NULL DEFAULT 0.0 CHECK(score >= 0.0 AND score <= 1.0),
      ttl INTEGER NOT NULL CHECK(ttl >= 0),
      state TEXT NOT NULL CHECK(state IN ('silent', 'ready', 'active')),
      accessCount INTEGER NOT NULL DEFAULT 0 CHECK(accessCount >= 0),
      isBTSP INTEGER NOT NULL DEFAULT 0 CHECK(isBTSP IN (0, 1)),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Create entries_value table
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries_value (
      id TEXT PRIMARY KEY NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      metadata TEXT,
      FOREIGN KEY (id) REFERENCES entries_index(id) ON DELETE CASCADE
    );
  `);

  // Create optimization_stats table
  db.exec(`
    CREATE TABLE IF NOT EXISTS optimization_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      tokens_before INTEGER NOT NULL,
      tokens_after INTEGER NOT NULL,
      entries_pruned INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_entries_state ON entries_index(state);
    CREATE INDEX IF NOT EXISTS idx_entries_score ON entries_index(score DESC);
    CREATE INDEX IF NOT EXISTS idx_entries_hash ON entries_index(hash);
    CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON entries_index(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_stats_timestamp ON optimization_stats(timestamp DESC);
  `);

  // Prepare statements for better performance
  const putIndexStmt = db.prepare(`
    INSERT OR REPLACE INTO entries_index
    (id, hash, timestamp, score, ttl, state, accessCount, isBTSP)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const putValueStmt = db.prepare(`
    INSERT OR REPLACE INTO entries_value
    (id, content, tags, metadata)
    VALUES (?, ?, ?, ?)
  `);

  const getStmt = db.prepare(`
    SELECT
      i.id, i.hash, i.timestamp, i.score, i.ttl, i.state, i.accessCount, i.isBTSP,
      v.content, v.tags, v.metadata
    FROM entries_index i
    JOIN entries_value v ON i.id = v.id
    WHERE i.id = ?
  `);

  const deleteIndexStmt = db.prepare('DELETE FROM entries_index WHERE id = ?');
  const deleteValueStmt = db.prepare('DELETE FROM entries_value WHERE id = ?');

  return {
    async put(entry: MemoryEntry): Promise<void> {
      const transaction = db.transaction(() => {
        putIndexStmt.run(
          entry.id,
          entry.hash,
          entry.timestamp,
          entry.score,
          entry.ttl,
          entry.state,
          entry.accessCount,
          entry.isBTSP ? 1 : 0,
        );

        putValueStmt.run(
          entry.id,
          entry.content,
          JSON.stringify(entry.tags),
          JSON.stringify(entry.metadata),
        );
      });

      transaction();
    },

    async get(id: string): Promise<MemoryEntry | null> {
      const row = getStmt.get(id) as unknown;

      if (!row) {
        return null;
      }

      const r = row as {
        id: string;
        hash: string;
        timestamp: number;
        score: number;
        ttl: number;
        state: string;
        accessCount: number;
        isBTSP: number;
        content: string;
        tags: string | null;
        metadata: string | null;
      };

      return {
        id: r.id,
        content: r.content,
        hash: r.hash,
        timestamp: r.timestamp,
        score: r.score,
        ttl: r.ttl,
        state: r.state as 'silent' | 'ready' | 'active',
        accessCount: r.accessCount,
        tags: r.tags ? JSON.parse(r.tags) : [],
        metadata: r.metadata ? JSON.parse(r.metadata) : {},
        isBTSP: r.isBTSP === 1,
      };
    },

    async query(filters: MemoryQueryFilters): Promise<MemoryEntry[]> {
      let sql = `
        SELECT
          i.id, i.hash, i.timestamp, i.score, i.ttl, i.state, i.accessCount, i.isBTSP,
          v.content, v.tags, v.metadata
        FROM entries_index i
        JOIN entries_value v ON i.id = v.id
        WHERE 1=1
      `;

      const params: unknown[] = [];

      if (filters.state) {
        sql += ' AND i.state = ?';
        params.push(filters.state);
      }

      if (filters.minScore !== undefined) {
        sql += ' AND i.score >= ?';
        params.push(filters.minScore);
      }

      if (filters.maxScore !== undefined) {
        sql += ' AND i.score <= ?';
        params.push(filters.maxScore);
      }

      if (filters.isBTSP !== undefined) {
        sql += ' AND i.isBTSP = ?';
        params.push(filters.isBTSP ? 1 : 0);
      }

      sql += ' ORDER BY i.score DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }

      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as unknown[];

      return rows.map((row) => {
        const r = row as {
          id: string;
          hash: string;
          timestamp: number;
          score: number;
          ttl: number;
          state: string;
          accessCount: number;
          isBTSP: number;
          content: string;
          tags: string | null;
          metadata: string | null;
        };

        return {
          id: r.id,
          content: r.content,
          hash: r.hash,
          timestamp: r.timestamp,
          score: r.score,
          ttl: r.ttl,
          state: r.state as 'silent' | 'ready' | 'active',
          accessCount: r.accessCount,
          tags: r.tags ? JSON.parse(r.tags) : [],
          metadata: r.metadata ? JSON.parse(r.metadata) : {},
          isBTSP: r.isBTSP === 1,
        };
      });
    },

    async delete(id: string): Promise<void> {
      const transaction = db.transaction(() => {
        deleteIndexStmt.run(id);
        deleteValueStmt.run(id);
      });

      transaction();
    },

    async list(): Promise<string[]> {
      const stmt = db.prepare('SELECT id FROM entries_index');
      const rows = stmt.all() as { id: string }[];
      return rows.map((r) => r.id);
    },

    async compact(): Promise<number> {
      const before = db.prepare('SELECT COUNT(*) as count FROM entries_index').get() as {
        count: number;
      };

      // Remove fully decayed entries (this will be enhanced in sleep-compressor)
      db.exec('DELETE FROM entries_index WHERE ttl <= 0');

      db.exec('VACUUM');

      const after = db.prepare('SELECT COUNT(*) as count FROM entries_index').get() as {
        count: number;
      };

      return before.count - after.count;
    },

    async close(): Promise<void> {
      db.close();
    },

    async recordOptimization(stats: Omit<OptimizationStats, 'id'>): Promise<void> {
      const stmt = db.prepare(`
        INSERT INTO optimization_stats (timestamp, tokens_before, tokens_after, entries_pruned, duration_ms)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        stats.timestamp,
        stats.tokens_before,
        stats.tokens_after,
        stats.entries_pruned,
        stats.duration_ms,
      );
    },

    async getOptimizationStats(): Promise<OptimizationStats[]> {
      const stmt = db.prepare(`
        SELECT id, timestamp, tokens_before, tokens_after, entries_pruned, duration_ms
        FROM optimization_stats
        ORDER BY timestamp DESC
      `);

      const rows = stmt.all() as OptimizationStats[];
      return rows;
    },

    async clearOptimizationStats(): Promise<void> {
      db.exec('DELETE FROM optimization_stats');
    },
  };
}
