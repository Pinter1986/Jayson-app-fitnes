# App Jayson Lucian · Personal Trainer

App web instalável no celular (PWA) para o Jayson Lucian (CREF 018556-G/SC) vender e gerenciar
aulas presenciais e consultoria online.

**Stack:** Next.js (App Router) + TypeScript + Tailwind, Supabase (Auth, Postgres com RLS, Storage) e Vercel.

Para colocar no ar, veja **[SETUP.md](SETUP.md)**.

## Fase 1 (feita)
- Página de vendas com planos e botão "Quero começar".
- Cadastro com e-mail e senha, confirmação por e-mail, "esqueci minha senha".
- Primeiro acesso: PAR-Q, anamnese e aceites LGPD registrados com versão, data e hora.
- **Aluno:** Início, Agenda (reserva e cancelamento), Treino (vídeo, registro de carga, gráfico),
  Evolução, Financeiro (valor com taxa do cartão por parcela, comprovantes, indicação) e Perfil
  (dados, avisos, tema claro/escuro, baixar meus dados, cancelar plano com 30 dias).
- **Jayson:** Painel, Agenda semanal (presença, falta, cancelar, marcar para aluno, bloqueios),
  Alunos (filtros, ficha, observações privadas, cadastro/importação), Treinos (modelos, copiar,
  biblioteca de exercícios, cargas registradas), Financeiro (gerar mensalidades, registrar pagamento
  presencial, cobrança pronta para o WhatsApp, multa, exportar planilha) e Ajustes.

## Regras no banco (`supabase/migrations/0003_funcoes.sql`)
- `reservar_aula`: horário de atendimento, bloqueios, antecedência mínima, abertura da agenda,
  até N alunos por horário, mesma academia no horário, deslocamento entre academias, saldo do plano.
  Uma trava na transação garante que a última vaga não seja vendida duas vezes.
- Sem plano presencial (ou aula em dupla), a reserva gera a cobrança avulsa.
- `cancelar_aula`: até 24h antes devolve a aula; depois conta como dada.
- `gerar_mensalidades`: cria as mensalidades do mês sem duplicar.
- Preços, taxas e regras ficam na tabela `settings`/`plans`, editáveis em Ajustes.

## Fases seguintes
- **Fase 2:** pagamento online (Asaas ou InfinitePay), recorrência, avaliação com fotos e 7 dobras,
  check-in, desconto de indicação, página de vendas completa com depoimentos.
- **Fase 3:** WhatsApp automático, alertas de aluno parado, relatórios.

## Pendências com o Jayson
Ver a lista no documento do projeto. Padrões adotados até a confirmação (todos editáveis):
atendimento todos os dias 5h–22h; aula em dupla R$ 90 por pessoa; aula avulsa paga na reserva ou no
local; taxas do cartão de exemplo; anamnese com perguntas genéricas + PAR-Q (`lib/anamnese.ts`);
contrato e termos provisórios.
