import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Verificando banco de dados...')
  
  // Verificar usuários existentes
  const existingUsers = await prisma.user.findMany()
  console.log(`Usuários existentes: ${existingUsers.length}`)
  
  if (existingUsers.length > 0) {
    console.log('Usuários:', existingUsers.map(u => ({ email: u.email, name: u.name, role: u.role })))
    return
  }
  
  console.log('Criando usuários de teste...')
  
  const hashedPassword = await bcrypt.hash('123456', 10)

  // Criar diretor
  const director = await prisma.user.create({
    data: {
      id: 'director-001',
      email: 'diretor@teste.com',
      name: 'João Silva - Diretor',
      password: hashedPassword,
      phone: '(11) 99999-0001',
      role: 'DIRECTOR',
      isActive: true,
      totalPoints: 0,
      level: 1,
      streak: 0,
    }
  })
  console.log('✅ Diretor criado:', director.email)

  // Criar igreja
  const church = await prisma.church.create({
    data: {
      id: 'church-001',
      name: 'IASD Central de São Paulo',
      slug: 'iasd-central-sp',
      address: 'Rua Augusta, 123',
      city: 'São Paulo',
      state: 'SP',
      phone: '(11) 99999-9999',
      email: 'central@iasd-sp.org',
      adminId: director.id
    }
  })
  console.log('✅ Igreja criada:', church.name)

  // Atualizar diretor com churchId
  await prisma.user.update({
    where: { id: director.id },
    data: { churchId: church.id }
  })

  // Criar músicos
  const musicians = [
    { name: 'Maria Santos', email: 'maria@teste.com', phone: '(11) 99999-0002', instruments: ['violao', 'guitarra'] },
    { name: 'Pedro Costa', email: 'pedro@teste.com', phone: '(11) 99999-0003', instruments: ['baixo'] },
    { name: 'Ana Oliveira', email: 'ana@teste.com', phone: '(11) 99999-0004', instruments: ['piano'] },
  ]

  for (const m of musicians) {
    const musician = await prisma.user.create({
      data: {
        email: m.email,
        name: m.name,
        password: hashedPassword,
        phone: m.phone,
        role: 'MUSICIAN',
        isActive: true,
        churchId: church.id,
        totalPoints: 0,
        level: 1,
        streak: 0,
        profile: {
          create: {
            instruments: JSON.stringify(m.instruments),
            vocals: JSON.stringify([]),
          }
        }
      }
    })
    console.log('✅ Músico criado:', musician.email)
  }

  console.log('\n🎉 Seed concluído!')
  console.log('-------------------')
  console.log('Credenciais de teste:')
  console.log('Diretor: diretor@teste.com / 123456')
  console.log('Músico: maria@teste.com / 123456')
  console.log('Músico: pedro@teste.com / 123456')
  console.log('Músico: ana@teste.com / 123456')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
