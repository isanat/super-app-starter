import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Verificando dados do banco...\n')

  // Verificar usuários
  const users = await prisma.user.findMany()
  console.log(`👤 Usuários: ${users.length}`)
  users.forEach(u => console.log(`   - ${u.name} (${u.email}) - ${u.role}`))

  // Verificar igrejas
  const churches = await prisma.church.findMany()
  console.log(`\n⛪ Igrejas: ${churches.length}`)
  churches.forEach(c => console.log(`   - ${c.name}`))

  // Verificar eventos
  const events = await prisma.event.findMany()
  console.log(`\n📅 Eventos: ${events.length}`)

  // Verificar perfis de músico
  const profiles = await prisma.musicianProfile.findMany()
  console.log(`\n🎵 Perfis de Músico: ${profiles.length}`)

  // Verificar grupos
  const groups = await prisma.musicGroup.findMany()
  console.log(`\n👥 Grupos: ${groups.length}`)

  // Verificar convites
  const invitations = await prisma.eventInvitation.findMany()
  console.log(`\n📨 Convites: ${invitations.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
