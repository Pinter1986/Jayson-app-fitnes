# Como colocar o app no ar

Tudo no nome e no e-mail do Jayson (jaysone2012@gmail.com).

## 1. Supabase (banco, login e fotos)
1. Crie a conta em supabase.com e um projeto (região **São Paulo**).
2. Em **SQL Editor**, rode, nesta ordem, o conteúdo de:
   - `supabase/migrations/0001_tabelas.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_funcoes.sql`
   - `supabase/migrations/0004_storage.sql`
   - `supabase/seed.sql` (planos, academias, horários e textos iniciais)
3. **Authentication › Sign In / Providers › Email**: deixe *Confirm email* ligado.
4. **Authentication › URL Configuration**:
   - Site URL: `https://SEU-DOMINIO` (ou o endereço `.vercel.app`)
   - Redirect URLs: `https://SEU-DOMINIO/auth/callback`
5. **Authentication › Emails**: traduza os textos dos e-mails de confirmação e de nova senha (opcional, recomendado).
6. Copie de **Project Settings › API**: a URL, a chave `anon` e a chave `service_role`.

## 2. Vercel (hospedagem)
1. Crie a conta em vercel.com com o GitHub e importe este repositório.
2. Em **Environment Variables**, cadastre:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (secreta; usada só para o Jayson cadastrar aluno)
   - `NEXT_PUBLIC_SITE_URL` = `https://SEU-DOMINIO`
3. Deploy. A cada push no GitHub, a Vercel atualiza o app sozinha.

## 3. Conta do Jayson como admin
1. O Jayson cria a conta pelo próprio app em `/cadastro` e confirma o e-mail.
2. No SQL Editor do Supabase:
   ```sql
   update profiles set papel = 'admin' where email = 'jaysone2012@gmail.com';
   ```
3. Ao entrar de novo, ele cai direto na área de gestão (`/admin`).

## 4. Primeiros ajustes (em /admin/ajustes)
- Conferir horários de atendimento (vêm 5h às 22h todos os dias).
- Chave PIX e WhatsApp (o número (47) 3271-6304 parece fixo: confirmar).
- Taxas reais da InfinitePay (vêm taxas **de exemplo**, marcadas como tal).
- Contrato e termos: os textos são **provisórios**. Revisar com advogado e trocar a versão.

## 5. Importar os 19 alunos atuais
Em **Alunos › Cadastrar aluno**: nome, e-mail, WhatsApp, plano, valor e vencimento.
Depois de salvar, a ficha mostra um link de WhatsApp com a mensagem de primeiro acesso.
O aluno entra em **Esqueci minha senha**, cria a senha, responde a anamnese e aceita os termos.

## 6. Domínio (opcional)
Registre em registro.br (ex.: jaysonlucian.com.br) e aponte para a Vercel em
**Project › Settings › Domains**. Atualize a Site URL do Supabase e `NEXT_PUBLIC_SITE_URL`.

## Todo mês
Em **Financeiro**, toque em **Gerar mensalidades do mês** (não duplica se tocar duas vezes).
Na fase 2 isso fica automático, junto com o pagamento online.

## Rodar no computador (desenvolvedor)
```bash
cp .env.example .env.local   # preencha com as chaves do Supabase
npm install
npm run dev                  # http://localhost:3000
```
