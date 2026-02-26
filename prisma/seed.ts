import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // Criar usuário diretor PRIMEIRO
  const director = await prisma.user.upsert({
    where: { email: 'diretor@teste.com' },
    update: {},
    create: {
      id: 'director-001',
      email: 'diretor@teste.com',
      name: 'João Silva - Diretor',
      password: hashedPassword,
      phone: '(11) 99999-0001',
      role: 'DIRECTOR',
      isActive: true
    }
  });

  console.log('✅ Diretor criado:', director.name);

  // Criar igreja com o diretor como admin
  const church = await prisma.church.upsert({
    where: { slug: 'iasd-central-sp' },
    update: {},
    create: {
      id: 'church-001',
      name: 'IASD Central de São Paulo',
      slug: 'iasd-central-sp',
      address: 'Rua Augusta, 123',
      city: 'São Paulo',
      state: 'SP',
      phone: '(11) 99999-9999',
      email: 'central@iasd-sp.org',
      serviceTimes: JSON.stringify({
        sabbathSchool: '9:00',
        divineService: '10:30',
        sabbathAfternoon: '15:00',
        wednesdayService: '19:30'
      }),
      adminId: director.id
    }
  });

  console.log('✅ Igreja criada:', church.name);

  // Atualizar diretor com churchId
  await prisma.user.update({
    where: { id: director.id },
    data: { churchId: church.id }
  });

  // Criar músicos
  const musicians = [
    {
      id: 'musician-001',
      email: 'cantor@teste.com',
      name: 'Maria Santos - Cantora',
      phone: '(11) 99999-0002',
      role: 'SINGER',
      instruments: '[]',
      vocals: '["soprano", "contralto"]'
    },
    {
      id: 'musician-002',
      email: 'instrumentista@teste.com',
      name: 'Pedro Oliveira - Instrumentista',
      phone: '(11) 99999-0003',
      role: 'INSTRUMENTALIST',
      instruments: '["violao", "guitarra", "baixo"]',
      vocals: null
    },
    {
      id: 'musician-003',
      email: 'tecladista@teste.com',
      name: 'Ana Costa - Tecladista',
      phone: '(11) 99999-0004',
      role: 'INSTRUMENTALIST',
      instruments: '["teclado", "piano"]',
      vocals: null
    },
    {
      id: 'musician-004',
      email: 'baterista@teste.com',
      name: 'Lucas Ferreira - Baterista',
      phone: '(11) 99999-0005',
      role: 'INSTRUMENTALIST',
      instruments: '["bateria", "percussao"]',
      vocals: null
    }
  ];

  for (const musician of musicians) {
    const user = await prisma.user.upsert({
      where: { email: musician.email },
      update: {},
      create: {
        id: musician.id,
        email: musician.email,
        name: musician.name,
        password: hashedPassword,
        phone: musician.phone,
        role: musician.role as any,
        churchId: church.id,
        isActive: true,
        weeklyAvailability: JSON.stringify({
          sabado: { manha: true, tarde: true },
          domingo: { manha: false, tarde: false },
          quarta: { noite: true }
        })
      }
    });

    // Criar perfil do músico
    await prisma.musicianProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        instruments: musician.instruments,
        vocals: musician.vocals,
        yearsExperience: 5,
        bio: `Músico da igreja ${church.name}`
      }
    });

    console.log('✅ Músico criado:', user.name);
  }

  console.log('🎉 Seed concluído com sucesso!');
  console.log('\n📋 Contas de teste:');
  console.log('  Diretor: diretor@teste.com / 123456');
  console.log('  Cantor: cantor@teste.com / 123456');
  console.log('  Instrumentista: instrumentista@teste.com / 123456');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
