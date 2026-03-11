import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Neon PostgreSQL connection
// Priority: 1. NEON_DATABASE_URL env, 2. DATABASE_URL from .env (if postgresql://), 3. hardcoded fallback
const getDatabaseUrl = (): string => {
  // First check for NEON_DATABASE_URL (highest priority - use this to override shell env)
  const neonUrl = process.env.NEON_DATABASE_URL
  if (neonUrl && neonUrl.startsWith('postgresql://')) {
    return neonUrl
  }

  // Then check DATABASE_URL - but only use it if it's a PostgreSQL URL
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl && databaseUrl.startsWith('postgresql://')) {
    return databaseUrl
  }

  // Hardcoded fallback for Neon database
  return 'postgresql://neondb_owner:npg_fpYOD6th3nBT@ep-misty-mouse-a17jt54s.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
}

const connectionString = getDatabaseUrl()

// Debug: Log connection string status (mask the password)
const masked = connectionString.replace(/:([^@]+)@/, ':****@')
console.log('Database connection:', masked)

// Create Neon HTTP client - optimized for serverless
const sql = neon(connectionString)

// Drizzle database instance
export const db = drizzle(sql, { schema })

// Export schema for convenience
export * from './schema'

// Type exports
export type Database = typeof db
