# Deploy no Vercel (produção)

## 1) Pré-requisitos
- Projeto no GitHub com este código.
- Conta Vercel.
- Projeto Supabase criado.

## 2) Variáveis de ambiente (Vercel)
Em **Project Settings > Environment Variables**, configure (Production/Preview/Development):

Obrigatórias:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Compatibilidade (opcional):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> **Nunca** use no frontend: `SERVICE_ROLE_KEY`, `SECRET_KEY`, `JWT_SECRET` ou senha do Postgres.

## 3) Build settings
- Framework: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

## 4) Banco de dados (reaplicar migrations do zero)
No Supabase, rode em ordem os SQLs de `supabase/migrations/`.

Se quiser recriar tudo do zero:
1. Crie um projeto Supabase novo.
2. Execute os arquivos de migration em ordem cronológica pelo nome.
3. Verifique se tabelas `profiles`, `churches`, `user_roles`, `events`, `event_musicians`, `director_votes` foram criadas.

## 5) Deploy
Clique em **Deploy** na Vercel e depois **Redeploy** se alterar variáveis.
