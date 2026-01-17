import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

type PrismaClientInstance = InstanceType<typeof PrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientInstance
  pgPool?: Pool
}

function shouldEnableSsl(connectionString: string | undefined): boolean {
  if (!connectionString) return false
  try {
    const parsed = new URL(connectionString)
    const sslMode = parsed.searchParams.get("sslmode")
    const ssl = parsed.searchParams.get("ssl")

    return sslMode === "require" || ssl === "true"
  } catch {
    return false
  }
}

function createPgPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  const enableSsl = shouldEnableSsl(connectionString)

  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT_MS ?? 30_000),
    connectionTimeoutMillis: Number(
      process.env.PG_POOL_CONNECTION_TIMEOUT_MS ?? 10_000,
    ),
    keepAlive: true,
    keepAliveInitialDelayMillis: Number(
      process.env.PG_KEEPALIVE_INITIAL_DELAY_MS ?? 10_000,
    ),
    ssl: enableSsl ? { rejectUnauthorized: false } : undefined,
  })
}

const pgPool =
  globalForPrisma.pgPool ??
  createPgPool()

const adapter = new PrismaPg(pgPool)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pgPool = pgPool
  globalForPrisma.prisma = prisma
}
