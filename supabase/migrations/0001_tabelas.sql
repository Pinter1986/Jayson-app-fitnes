-- App Jayson Lucian · tabelas principais
-- Valores em centavos (inteiro). Datas/horas em timestamptz; regras de calendário usam America/Sao_Paulo.

create type papel as enum ('aluno', 'admin');
create type tipo_plano as enum ('presencial', 'online', 'avulsa', 'dupla', 'avaliacao');
create type status_assinatura as enum ('pendente', 'ativa', 'cancelamento_pedido', 'encerrada');
create type status_reserva as enum ('marcada', 'cancelada', 'cancelada_tarde', 'dada', 'falta');
create type tipo_cobranca as enum ('mensalidade', 'avulsa', 'dupla', 'avaliacao', 'outro');
create type status_cobranca as enum ('aberta', 'paga', 'cancelada');
create type forma_pagamento as enum ('pix', 'credito', 'debito', 'dinheiro', 'tap_to_pay');
create type tipo_checkin as enum ('diario', 'semanal');

-- Perfis --------------------------------------------------------------------
create table profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  papel             papel not null default 'aluno',
  nome              text not null,
  email             text,
  whatsapp          text,
  nascimento        date,
  sexo              text check (sexo in ('M', 'F')),
  origem            text check (origem in ('instagram', 'indicacao', 'outro', 'importado')),
  codigo_indicacao  text unique not null default substr(md5(gen_random_uuid()::text), 1, 8),
  indicado_por      uuid references profiles (id) on delete set null,
  avisos_email      boolean not null default true,
  avisos_whatsapp   boolean not null default true,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now()
);

-- Observações privadas do Jayson (aluno não vê)
create table admin_notes (
  aluno_id      uuid primary key references profiles (id) on delete cascade,
  texto         text not null default '',
  atualizado_em timestamptz not null default now()
);

-- Planos e serviços ---------------------------------------------------------
create table plans (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  tipo           tipo_plano not null,
  preco_centavos integer not null check (preco_centavos >= 0),
  aulas_semana   smallint,
  aulas_mes      smallint,           -- saldo mensal do plano presencial
  meses          smallint not null default 1,
  descricao      text,
  ativo          boolean not null default true,
  ordem          smallint not null default 0
);

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  aluno_id               uuid not null references profiles (id) on delete cascade,
  plano_id               uuid not null references plans (id),
  valor_centavos         integer not null check (valor_centavos >= 0),
  dia_vencimento         smallint not null check (dia_vencimento in (5, 10)),
  inicio                 date not null default current_date,
  status                 status_assinatura not null default 'pendente',
  cancelamento_pedido_em timestamptz,
  fim                    date,
  criado_em              timestamptz not null default now()
);
-- uma assinatura viva por aluno
create unique index subscriptions_uma_viva on subscriptions (aluno_id) where status <> 'encerrada';

-- Agenda --------------------------------------------------------------------
create table gyms (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  intervalo_min smallint not null default 0 check (intervalo_min >= 0),
  ativo         boolean not null default true,
  ordem         smallint not null default 0
);

create table availability (
  id          uuid primary key default gen_random_uuid(),
  dia_semana  smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora_inicio time not null,
  hora_fim    time not null,
  check (hora_fim > hora_inicio)
);

create table availability_blocks (
  id     uuid primary key default gen_random_uuid(),
  inicio timestamptz not null,
  fim    timestamptz not null,
  motivo text,
  check (fim > inicio)
);

create table bookings (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid not null references profiles (id) on delete cascade,
  inicio       timestamptz not null,
  fim          timestamptz not null,
  academia_id  uuid not null references gyms (id),
  status       status_reserva not null default 'marcada',
  dupla        boolean not null default false,
  cobranca_id  uuid,
  criado_por   uuid references profiles (id),
  criado_em    timestamptz not null default now(),
  cancelado_em timestamptz
);
create index bookings_inicio on bookings (inicio);
create unique index bookings_aluno_horario on bookings (aluno_id, inicio)
  where status in ('marcada', 'dada', 'falta');

-- Financeiro ----------------------------------------------------------------
create table invoices (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references profiles (id) on delete cascade,
  assinatura_id   uuid references subscriptions (id) on delete set null,
  tipo            tipo_cobranca not null,
  descricao       text not null,
  competencia     date,               -- 1º dia do mês, nas mensalidades
  vencimento      date not null,
  valor_centavos  integer not null check (valor_centavos >= 0),
  multa_centavos  integer not null default 0,
  taxa_centavos   integer not null default 0,  -- taxa do cartão repassada
  forma           forma_pagamento,
  parcelas        smallint not null default 1 check (parcelas between 1 and 12),
  status          status_cobranca not null default 'aberta',
  pago_em         timestamptz,
  provedor_id     text,               -- id no serviço de pagamento (fase 2)
  criado_em       timestamptz not null default now()
);
create unique index invoices_mensalidade_unica on invoices (assinatura_id, competencia)
  where tipo = 'mensalidade' and status <> 'cancelada';
create index invoices_aluno on invoices (aluno_id, vencimento);

alter table bookings
  add constraint bookings_cobranca_fk foreign key (cobranca_id) references invoices (id) on delete set null;

-- Treinos -------------------------------------------------------------------
create table exercises (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  grupo      text,
  video_url  text,
  tecnica    text,
  observacao text,
  ativo      boolean not null default true
);

-- aluno_id nulo = modelo reutilizável
create table workouts (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid references profiles (id) on delete cascade,
  nome         text not null,
  observacao   text,
  ativo        boolean not null default true,
  ordem        smallint not null default 0,
  publicado_em timestamptz not null default now(),
  criado_em    timestamptz not null default now()
);

create table workout_items (
  id             uuid primary key default gen_random_uuid(),
  treino_id      uuid not null references workouts (id) on delete cascade,
  exercicio_id   uuid not null references exercises (id),
  ordem          smallint not null default 0,
  series         smallint,
  repeticoes     text,      -- "8 a 12" ou "30s"
  carga_sugerida text,
  descanso_seg   smallint,
  tecnica        text,
  observacao     text
);

-- item_id nulo = registro de cardio do dia
create table workout_logs (
  id          uuid primary key default gen_random_uuid(),
  aluno_id    uuid not null references profiles (id) on delete cascade,
  treino_id   uuid references workouts (id) on delete set null,
  item_id     uuid references workout_items (id) on delete set null,
  data        date not null default current_date,
  carga_kg    numeric(6, 2),
  repeticoes  smallint,
  esforco     smallint check (esforco between 1 and 10),
  cardio_tipo text,
  cardio_min  smallint,
  cardio_km   numeric(5, 2),
  observacao  text,
  criado_em   timestamptz not null default now()
);
create index workout_logs_aluno on workout_logs (aluno_id, data);

-- Avaliação, anamnese, check-in (telas completas na fase 2) ----------------
create table assessments (
  id              uuid primary key default gen_random_uuid(),
  aluno_id        uuid not null references profiles (id) on delete cascade,
  data            date not null default current_date,
  peso_kg         numeric(5, 2),
  altura_cm       numeric(5, 1),
  medidas         jsonb not null default '{}',
  dobras          jsonb not null default '{}',
  densidade       numeric(6, 5),
  gordura_pct     numeric(4, 1),
  notas_posturais jsonb not null default '{}',
  fotos           jsonb not null default '[]',   -- caminhos no bucket privado
  observacao      text,
  criado_em       timestamptz not null default now()
);

create table anamnesis (
  aluno_id      uuid primary key references profiles (id) on delete cascade,
  respostas     jsonb not null default '{}',
  parq          jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);

create table checkins (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references profiles (id) on delete cascade,
  tipo          tipo_checkin not null,
  data          date not null default current_date,
  respostas     jsonb not null default '{}',
  peso_kg       numeric(5, 2),
  fotos         jsonb not null default '[]',
  relato        text,
  resposta      text,
  respondido_em timestamptz,
  criado_em     timestamptz not null default now()
);

-- Aceites LGPD: registro imutável com versão do texto e data/hora
create table consents (
  id        uuid primary key default gen_random_uuid(),
  aluno_id  uuid not null references profiles (id) on delete cascade,
  tipo      text not null check (tipo in ('contrato', 'termos_privacidade', 'responsabilidade', 'fotos_acompanhamento', 'divulgacao')),
  versao    text not null,
  valor     text not null default 'aceito',  -- divulgação: nao / sem_rosto / autorizo
  criado_em timestamptz not null default now()
);
create index consents_aluno on consents (aluno_id, tipo, criado_em desc);

create table referrals (
  id                 uuid primary key default gen_random_uuid(),
  indicador_id       uuid not null references profiles (id) on delete cascade,
  indicado_id        uuid not null unique references profiles (id) on delete cascade,
  desconto_centavos  integer not null default 0,
  aplicado_em        timestamptz,
  criado_em          timestamptz not null default now()
);

-- Ajustes (linha única) -----------------------------------------------------
create table settings (
  id                     smallint primary key default 1 check (id = 1),
  duracao_aula_min       smallint not null default 60,
  alunos_por_horario     smallint not null default 2,
  abertura_dias          smallint not null default 2,
  antecedencia_min_horas smallint not null default 2,
  cancelamento_horas     smallint not null default 24,
  multa_pct              numeric(5, 2) not null default 2,
  juros_mes_pct          numeric(5, 2) not null default 0,
  -- taxa do cartão em % por forma: {"debito": 1.37, "credito": {"1": 3.15, "2": 4.5, ...}}
  taxas_cartao           jsonb not null default '{}',
  taxas_sao_exemplo      boolean not null default true,
  whatsapp               text,
  chave_pix              text,
  combinados             text not null default '',
  -- textos legais e da página de vendas: {"contrato": {"versao": "...", "texto": "..."}, ...}
  textos                 jsonb not null default '{}',
  atualizado_em          timestamptz not null default now()
);
