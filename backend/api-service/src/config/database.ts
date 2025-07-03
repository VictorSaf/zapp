import { Pool } from 'pg';
import { DatabaseConfig } from '../types';

export class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
      process.exit(-1);
    });
  }

  public static getInstance(config: DatabaseConfig): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(config);
    }
    return DatabaseConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection successful at:', result.rows[0]?.now);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}