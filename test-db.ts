import { PrismaClient } from "./app/generated/prisma/client/index.js"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import "dotenv/config"

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany()
  console.log(users)
}
main()
