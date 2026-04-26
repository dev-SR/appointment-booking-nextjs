import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

const globalForPrisma = global as unknown as {
  prisma: PrismaClient
}

const dbType = process.env.DB_TYPE

let adapter

if (dbType === "sqlite") {
  adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL,
  })
} else if (dbType === "postgres") {
  adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
} else {
  throw new Error("Invalid DB_TYPE. Use 'sqlite' or 'postgres'")
}

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma
