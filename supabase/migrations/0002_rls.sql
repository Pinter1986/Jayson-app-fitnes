-- Row Level Security: aluno só vê os próprios dados; o Jayson (admin) vê tudo.

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and papel = 'admin');
$$;

-- Perfil é criado junto com o usuário do Auth, com os dados do cadastro
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}');
  indicador uuid;
begin
  if meta ? 'indicacao' then
    select id into indicador from profiles where codigo_indicacao = meta ->> 'indicacao';
  end if;

  insert into profiles (id, nome, email, whatsapp, nascimento, sexo, origem, indicado_por)
  values (
    new.id,
    coalesce(nullif(meta ->> 'nome', ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(meta ->> 'whatsapp', ''),
    nullif(meta ->> 'nascimento', '')::date,
    nullif(meta ->> 'sexo', ''),
    coalesce(nullif(meta ->> 'origem', ''), case when indicador is not null then 'indicacao' end),
    indicador
  );

  if indicador is not null then
    insert into referrals (indicador_id, indicado_id) values (indicador, new.id);
  end if;

  -- plano escolhido no cadastro fica pendente até o Jayson confirmar
  if meta ? 'plano_id' then
    insert into subscriptions (aluno_id, plano_id, valor_centavos, dia_vencimento, status)
    select new.id, p.id, p.preco_centavos, coalesce((meta ->> 'dia_vencimento')::smallint, 10), 'pendente'
    from plans p where p.id = (meta ->> 'plano_id')::uuid and p.ativo;
  end if;

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Aluno não muda o próprio papel, status ou código
create or replace function profiles_protege_campos() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if new.papel is distinct from old.papel
       or new.ativo is distinct from old.ativo
       or new.codigo_indicacao is distinct from old.codigo_indicacao
       or new.indicado_por is distinct from old.indicado_por
       or new.origem is distinct from old.origem
       or new.email is distinct from old.email then
      raise exception 'Sem permissão para alterar este campo';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_protege
  before update on profiles
  for each row execute function profiles_protege_campos();

-- Habilita RLS em tudo -------------------------------------------------------
alter table profiles            enable row level security;
alter table admin_notes         enable row level security;
alter table plans               enable row level security;
alter table subscriptions       enable row level security;
alter table gyms                enable row level security;
alter table availability        enable row level security;
alter table availability_blocks enable row level security;
alter table bookings            enable row level security;
alter table invoices            enable row level security;
alter table exercises           enable row level security;
alter table workouts            enable row level security;
alter table workout_items       enable row level security;
alter table workout_logs        enable row level security;
alter table assessments         enable row level security;
alter table anamnesis           enable row level security;
alter table checkins            enable row level security;
alter table consents            enable row level security;
alter table referrals           enable row level security;
alter table settings            enable row level security;

-- Admin pode tudo em todas as tabelas
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'admin_notes', 'plans', 'subscriptions', 'gyms', 'availability',
    'availability_blocks', 'bookings', 'invoices', 'exercises', 'workouts',
    'workout_items', 'workout_logs', 'assessments', 'anamnesis', 'checkins',
    'consents', 'referrals', 'settings'
  ] loop
    execute format(
      'create policy admin_tudo on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Perfil: o próprio
create policy proprio_ler on profiles for select to authenticated using (id = auth.uid());
create policy proprio_editar on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Catálogos públicos (página de vendas lê sem login)
create policy publico_ler on plans for select to anon, authenticated using (ativo);
create policy publico_ler on gyms for select to anon, authenticated using (ativo);
create policy publico_ler on settings for select to anon, authenticated using (true);
create policy logado_ler on availability for select to authenticated using (true);
create policy logado_ler on availability_blocks for select to authenticated using (true);
create policy logado_ler on exercises for select to authenticated using (true);

-- Dados do próprio aluno (somente leitura; mudanças passam por funções)
create policy proprio_ler on subscriptions for select to authenticated using (aluno_id = auth.uid());
create policy proprio_ler on bookings      for select to authenticated using (aluno_id = auth.uid());
create policy proprio_ler on invoices      for select to authenticated using (aluno_id = auth.uid());
create policy proprio_ler on assessments   for select to authenticated using (aluno_id = auth.uid());
create policy proprio_ler on referrals     for select to authenticated using (indicador_id = auth.uid());

create policy proprio_ler on workouts for select to authenticated using (aluno_id = auth.uid());
create policy proprio_ler on workout_items for select to authenticated
  using (exists (select 1 from workouts w where w.id = treino_id and w.aluno_id = auth.uid()));

-- O aluno registra a própria carga
create policy proprio_ler on workout_logs for select to authenticated using (aluno_id = auth.uid());
create policy proprio_criar on workout_logs for insert to authenticated with check (aluno_id = auth.uid());
create policy proprio_editar on workout_logs for update to authenticated
  using (aluno_id = auth.uid()) with check (aluno_id = auth.uid());
create policy proprio_apagar on workout_logs for delete to authenticated using (aluno_id = auth.uid());

-- Anamnese: o aluno preenche e atualiza
create policy proprio_ler on anamnesis for select to authenticated using (aluno_id = auth.uid());
create policy proprio_criar on anamnesis for insert to authenticated with check (aluno_id = auth.uid());
create policy proprio_editar on anamnesis for update to authenticated
  using (aluno_id = auth.uid()) with check (aluno_id = auth.uid());

-- Check-in: aluno cria e lê; só o Jayson responde
create policy proprio_ler on checkins for select to authenticated using (aluno_id = auth.uid());
create policy proprio_criar on checkins for insert to authenticated
  with check (aluno_id = auth.uid() and resposta is null and respondido_em is null);

-- Aceites: aluno registra e lê, nunca altera nem apaga
create policy proprio_ler on consents for select to authenticated using (aluno_id = auth.uid());
create policy proprio_criar on consents for insert to authenticated with check (aluno_id = auth.uid());
