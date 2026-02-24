import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("=== USERS ===")
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      churchId: true,
      penaltyPoints: true,
      createdAt: true
    }
  })
  console.log(JSON.stringify(users, null, 2))
  
  console.log("\n=== CHURCHES ===")
  const churches = await prisma.church.findMany()
  console.log(JSON.stringify(churches, null, 2))
  
  console.log("\n=== EVENTS ===")
  const events = await prisma.event.findMany()
  console.log(JSON.stringify(events, null, 2))
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
