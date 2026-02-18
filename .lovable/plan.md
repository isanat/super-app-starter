

# 🎵 Super App de Louvor - Plano Completo

## Visão Geral
Reconstrução completa do app de gestão de ministério de louvor, com autenticação, banco de dados real (Supabase), design colorido e vibrante, e funcionalidades expandidas de comunicação.

---

## 1. 🔐 Autenticação e Perfis
- Tela de **login e cadastro** com email/senha
- **Seleção de perfil** após cadastro: Músico ou Diretor
- Sistema de **aprovação** — novos músicos aguardam aprovação do diretor
- Recuperação de senha

## 2. 🎨 Design e Navegação
- Visual **colorido e vibrante** com gradientes, cores vivas e ícones musicais
- Sidebar/menu de navegação responsivo (funciona bem no celular)
- Dashboards diferenciados para **Músico** e **Diretor**
- Tema claro com acentos coloridos

## 3. 👤 Área do Músico
- **Dashboard do Músico** — visão geral da agenda, próximos eventos, notificações
- **Perfil do Músico** — instrumentos, habilidades, foto, dados pessoais
- **Agenda** — visualização dos eventos escalados
- **Histórico de Eventos** — participações anteriores

## 4. 🎯 Área do Diretor
- **Dashboard do Diretor** — visão geral do ministério, estatísticas, pendências
- **Perfil do Diretor** — dados e configurações
- **Aprovar Músicos** — lista de músicos aguardando aprovação
- **Buscar Músicos** — pesquisa e filtro de músicos cadastrados
- **Minha Igreja** — dados e configurações da igreja
- **Votação de Diretor** — sistema de votação para escolha de liderança
- **Estatísticas** — gráficos de participação, frequência, instrumentos

## 5. 📅 Gestão de Eventos
- Criar e editar eventos/cultos com data, horário e local
- Escalar músicos para cada evento
- Histórico completo de eventos passados

## 6. 🔔 Notificações e Comunicação
- Notificações in-app para escalas, aprovações e lembretes
- Avisos do diretor para todo o ministério
- Indicadores visuais de novas notificações

## 7. 🗄️ Banco de Dados (Supabase/Lovable Cloud)
- Tabelas: usuários, perfis, igrejas, eventos, escalas, notificações, votos
- Autenticação integrada com Supabase Auth
- Políticas de segurança (RLS) por perfil
- Tabela separada de roles (músico/diretor) com segurança adequada

## 8. 📱 Responsividade
- App totalmente responsivo para uso no celular
- Navegação mobile-friendly com menu hamburger

