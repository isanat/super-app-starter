# Deploy no Vercel (produção)

## 1) Pré-requisitos
- Projeto no GitHub com este código.
- Conta Vercel.
- Variáveis de ambiente do Supabase:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## 2) Criar projeto na Vercel
1. No Vercel: **Add New Project**.
2. Importe o repositório.
3. Framework: **Vite** (detecção automática).
4. Build command: `npm run build`
5. Output directory: `dist`

## 3) Variáveis de ambiente
Em **Project Settings > Environment Variables**, adicione:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 4) Banco de dados (Supabase)
No SQL Editor do Supabase, rode as migrations da pasta `supabase/migrations/` (incluindo os campos de ministério).

## 5) Deploy
Clique em **Deploy** na Vercel.

---

## Observação sobre automação por token
Neste ambiente de execução, chamadas de rede externas para API/CLI da Vercel podem ser bloqueadas por política de rede/proxy, então o fluxo acima é o caminho confiável.
