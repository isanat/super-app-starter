import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Corrigindo dados...\n')
  
  // Buscar a igreja
  const church = await prisma.church.findFirst()
  
  if (!church) {
    console.log('❌ Nenhuma igreja encontrada!')
    return
  }
  
  console.log(`Igreja: ${church.name} (${church.id})`)
  
  // Atualizar usuários sem igreja
  const result = await prisma.user.updateMany({
    where: { churchId: null },
    data: { churchId: church.id }
  })
  
  console.log(`✅ ${result.count} usuários atualizados com churchId`)
  
  // Verificar resultado
  const users = await prisma.user.findMany({
    select: { name: true, email: true, role: true, churchId: true }
  })
  
  console.log('\n=== USUÁRIOS ATUALIZADOS ===')
  for (const u of users) {
    console.log(`${u.name} (${u.email}) - ${u.role} - ChurchId: ${u.churchId || 'NULO'}`)
  }
  
  console.log('\n🎉 Correção concluída!')
  console.log('-------------------')
  console.log('Credenciais de teste:')
  console.log('Diretor: diretor@teste.com / 123456')
  console.log('Músicos: joao@teste.com, maria@teste.com, pedro@teste.com / 123456')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
