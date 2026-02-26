import { PrismaClient, Role, EventType, EventStatus, InvitationStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Criar diretor primeiro (sem churchId inicialmente)
  const directorPassword = await bcrypt.hash('123456', 10)
  const director = await prisma.user.upsert({
    where: { email: 'diretor@teste.com' },
    update: {},
    create: {
      id: 'director-1',
      email: 'diretor@teste.com',
      name: 'João Diretor',
      password: directorPassword,
      phone: '(11) 99999-1111',
      role: Role.DIRECTOR,
      updatedAt: new Date(),
    },
  })
  console.log('✅ Diretor criado:', director.name)

  // Criar igreja com adminId
  const church = await prisma.church.upsert({
    where: { id: 'church-1' },
    update: {},
    create: {
      id: 'church-1',
      name: 'IASD Central',
      slug: 'iasd-central',
      city: 'São Paulo',
      state: 'SP',
      email: 'contato@iasdcentral.org',
      phone: '(11) 3333-4444',
      address: 'Rua da Igreja, 123',
      adminId: director.id,
      updatedAt: new Date(),
    },
  })
  console.log('✅ Igreja criada:', church.name)

  // Atualizar diretor com churchId
  await prisma.user.update({
    where: { id: director.id },
    data: { churchId: church.id },
  })

  // Criar músicos
  const musicianPassword = await bcrypt.hash('123456', 10)
  
  const musician1 = await prisma.user.upsert({
    where: { email: 'musico1@teste.com' },
    update: {},
    create: {
      id: 'musician-1',
      email: 'musico1@teste.com',
      name: 'Pedro Músico',
      password: musicianPassword,
      phone: '(11) 99999-2222',
      role: Role.MUSICIAN,
      churchId: church.id,
      totalPoints: 150,
      level: 2,
      updatedAt: new Date(),
    },
  })

  // Criar perfil de músico
  await prisma.musicianProfile.upsert({
    where: { userId: musician1.id },
    update: {},
    create: {
      id: 'profile-1',
      userId: musician1.id,
      instruments: JSON.stringify(['violao', 'guitarra']),
      vocals: JSON.stringify(['tenor']),
      totalEvents: 10,
      updatedAt: new Date(),
    },
  })
  console.log('✅ Músico 1 criado:', musician1.name)

  const musician2 = await prisma.user.upsert({
    where: { email: 'cantora@teste.com' },
    update: {},
    create: {
      id: 'musician-2',
      email: 'cantora@teste.com',
      name: 'Maria Cantora',
      password: musicianPassword,
      phone: '(11) 99999-3333',
      role: Role.SINGER,
      churchId: church.id,
      totalPoints: 200,
      level: 3,
      updatedAt: new Date(),
    },
  })

  await prisma.musicianProfile.upsert({
    where: { userId: musician2.id },
    update: {},
    create: {
      id: 'profile-2',
      userId: musician2.id,
      instruments: JSON.stringify([]),
      vocals: JSON.stringify(['soprano']),
      totalEvents: 15,
      updatedAt: new Date(),
    },
  })
  console.log('✅ Músico 2 criada:', musician2.name)

  // Criar evento de exemplo
  const event = await prisma.event.upsert({
    where: { id: 'event-1' },
    update: {},
    create: {
      id: 'event-1',
      title: 'Culto Divino - Domingo',
      type: EventType.DIVINE_SERVICE,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: 'Templo Principal',
      status: EventStatus.PUBLISHED,
      churchId: church.id,
      createdById: director.id,
      updatedAt: new Date(),
    },
  })
  console.log('✅ Evento criado:', event.title)

  // Criar convites
  await prisma.eventInvitation.upsert({
    where: { id: 'invitation-1' },
    update: {},
    create: {
      id: 'invitation-1',
      eventId: event.id,
      userId: musician1.id,
      role: 'INSTRUMENTALIST',
      instrument: 'violao',
      status: InvitationStatus.PENDING,
      updatedAt: new Date(),
    },
  })

  await prisma.eventInvitation.upsert({
    where: { id: 'invitation-2' },
    update: {},
    create: {
      id: 'invitation-2',
      eventId: event.id,
      userId: musician2.id,
      role: 'SINGER',
      vocalPart: 'soprano',
      status: InvitationStatus.PENDING,
      updatedAt: new Date(),
    },
  })
  console.log('✅ Convites criados')

  console.log('\n🎉 Seed concluído!')
  console.log('\n📋 Usuários de teste:')
  console.log('  Diretor: diretor@teste.com / 123456')
  console.log('  Músico: musico1@teste.com / 123456')
  console.log('  Cantora: cantora@teste.com / 123456')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
