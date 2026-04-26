import { Prisma, PrismaClient } from "@/app/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

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

const prisma = new PrismaClient({
  adapter,
})

const userData: Prisma.UserCreateInput[] = [
  {
    name: "Alice",
    email: "alice@prisma.io",
    posts: {
      create: [
        {
          title: "Join the Prisma Discord",
          content: "https://pris.ly/discord",
          published: true,
        },
        {
          title: "Prisma on YouTube",
          content: "https://pris.ly/youtube",
        },
      ],
    },
  },
  {
    name: "Bob",
    email: "bob@prisma.io",
    posts: {
      create: [
        {
          title: "Follow Prisma on Twitter",
          content: "https://www.twitter.com/prisma",
          published: true,
        },
      ],
    },
  },
]

export async function main() {
  for (const u of userData) {
    await prisma.user.create({ data: u })
  }
}

main()
