-- Regras de negócio no banco: agenda, saldo, cancelamento e mensalidades.
-- Tudo que o Jayson configura em Ajustes vale na hora (lido de settings).

-- Data/hora local de Jaraguá do Sul
create or replace function hora_local(ts timestamptz) returns timestamp
language sql immutable as $$ select ts at time zone 'America/Sao_Paulo' $$;

-- Aceite sempre com o horário do servidor
create or replace function consents_carimbo() returns trigger
language plpgsql as $$ begin new.criado_em := now(); return new; end $$;
create trigger consents_carimbo before insert on consents
  for each row execute function consents_carimbo();

-- Assinatura que dá direito a aula no momento (ativa ou em aviso de 30 dias)
create or replace function assinatura_vigente(p_aluno uuid)
returns table (assinatura_id uuid, plano_id uuid, tipo tipo_plano, aulas_mes smallint)
language sql stable security definer set search_path = public as $$
  select s.id, p.id, p.tipo, p.aulas_mes
  from subscriptions s join plans p on p.id = s.plano_id
  where s.aluno_id = p_aluno
    and s.status in ('ativa', 'cancelamento_pedido')
    and (s.fim is null or s.fim >= (hora_local(now()))::date)
  limit 1;
$$;

-- Saldo de aulas do plano no mês (mês de p_dia). Nulo = sem plano presencial.
create or replace function saldo_aulas(p_aluno uuid, p_dia date default null)
returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  v_aulas smallint;
  v_mes date := date_trunc('month', coalesce(p_dia, hora_local(now())::date))::date;
  v_usadas integer;
begin
  if p_aluno <> auth.uid() and not is_admin() then
    raise exception 'Sem permissão';
  end if;

  select aulas_mes into v_aulas from assinatura_vigente(p_aluno) where tipo = 'presencial';
  if v_aulas is null then
    return null;
  end if;

  select count(*) into v_usadas
  from bookings b
  where b.aluno_id = p_aluno
    and b.cobranca_id is null           -- aula avulsa paga à parte não consome saldo
    and b.status in ('marcada', 'dada', 'falta', 'cancelada_tarde')
    and date_trunc('month', hora_local(b.inicio))::date = v_mes;

  return greatest(v_aulas - v_usadas, 0);
end $$;

-- Horários livres para o aluno reservar (ou para o Jayson ver a grade)
create or replace function horarios_livres(p_de date, p_ate date)
returns table (inicio timestamptz, vagas integer, academia_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  s settings;
begin
  if auth.uid() is null then
    raise exception 'Faça login';
  end if;
  select * into s from settings where id = 1;

  return query
  with dias as (
    select d::date as dia from generate_series(p_de, p_ate, interval '1 day') d
  ),
  slots as (
    select distinct (gs at time zone 'America/Sao_Paulo') as ini
    from dias
    join availability a on a.dia_semana = extract(dow from dia)
    cross join lateral generate_series(
      dia + a.hora_inicio,
      dia + a.hora_fim - make_interval(mins => s.duracao_aula_min),
      make_interval(mins => s.duracao_aula_min)
    ) gs
  )
  select sl.ini,
         (s.alunos_por_horario - count(b.id))::integer,
         min(b.academia_id::text)::uuid
  from slots sl
  left join bookings b on b.inicio = sl.ini and b.status in ('marcada', 'dada', 'falta')
  where sl.ini >= now() + make_interval(hours => case when is_admin() then 0 else s.antecedencia_min_horas end)
    and (is_admin() or hora_local(sl.ini)::date <= hora_local(now())::date + s.abertura_dias)
    and not exists (
      select 1 from availability_blocks ab
      where ab.inicio < sl.ini + make_interval(mins => s.duracao_aula_min) and ab.fim > sl.ini)
  group by sl.ini
  having count(b.id) < s.alunos_por_horario
  order by sl.ini;
end $$;

-- Reserva com todas as regras; trava o horário para não vender a última vaga duas vezes.
-- p_aluno só é usado pelo Jayson (marcar aula para um aluno, sem regra de prazo e saldo).
create or replace function reservar_aula(
  p_inicio timestamptz,
  p_academia uuid,
  p_dupla boolean default false,
  p_aluno uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  v_admin boolean := is_admin();
  v_aluno uuid := case when p_aluno is not null and is_admin() then p_aluno else auth.uid() end;
  v_fim timestamptz;
  v_local timestamp := hora_local(p_inicio);
  v_ocupados integer;
  v_academia_slot uuid;
  v_intervalo integer;
  v_saldo integer;
  v_plano_avulso plans;
  v_cobranca uuid;
  v_id uuid;
begin
  if v_aluno is null then
    raise exception 'Faça login';
  end if;
  if p_aluno is not null and p_aluno <> auth.uid() and not v_admin then
    raise exception 'Sem permissão';
  end if;

  select * into s from settings where id = 1;
  v_fim := p_inicio + make_interval(mins => s.duracao_aula_min);

  if not exists (select 1 from profiles where id = v_aluno and ativo) then
    raise exception 'Cadastro inativo. Fale com o Jayson.';
  end if;
  if not exists (select 1 from gyms where id = p_academia and ativo) then
    raise exception 'Academia inválida';
  end if;

  -- prazo para marcar (o Jayson pode marcar fora do prazo)
  if not v_admin then
    if p_inicio < now() + make_interval(hours => s.antecedencia_min_horas) then
      raise exception 'Reserve com pelo menos % horas de antecedência', s.antecedencia_min_horas;
    end if;
    if v_local::date > hora_local(now())::date + s.abertura_dias then
      raise exception 'A agenda abre com % dias de antecedência', s.abertura_dias;
    end if;
  elsif p_inicio < now() - interval '30 days' then
    raise exception 'Data muito antiga';
  end if;

  -- dentro do horário de atendimento e fora de bloqueios
  if not exists (
    select 1 from availability a
    where a.dia_semana = extract(dow from v_local)
      and v_local::time >= a.hora_inicio
      and (v_local + make_interval(mins => s.duracao_aula_min))::time <= a.hora_fim
      and v_local::time < (v_local + make_interval(mins => s.duracao_aula_min))::time
      and mod(extract(epoch from v_local::time - a.hora_inicio)::integer, s.duracao_aula_min * 60) = 0
  ) then
    raise exception 'Horário fora do atendimento';
  end if;
  if exists (select 1 from availability_blocks ab where ab.inicio < v_fim and ab.fim > p_inicio) then
    raise exception 'Horário bloqueado';
  end if;

  -- trava a agenda até o fim da transação: duas pessoas na última vaga -> só uma consegue
  perform pg_advisory_xact_lock(hashtextextended('agenda', 0));

  if exists (
    select 1 from bookings
    where aluno_id = v_aluno and status in ('marcada', 'dada', 'falta')
      and inicio < v_fim and fim > p_inicio
  ) then
    raise exception 'Você já tem aula neste horário';
  end if;

  select count(*), min(academia_id::text)::uuid into v_ocupados, v_academia_slot
  from bookings
  where inicio = p_inicio and status in ('marcada', 'dada', 'falta');

  if v_ocupados >= s.alunos_por_horario then
    raise exception 'Esse horário acabou de ser preenchido';
  end if;
  if v_academia_slot is not null and v_academia_slot <> p_academia then
    raise exception 'Neste horário a aula é em outra academia';
  end if;

  -- deslocamento entre academias diferentes em aulas seguidas
  if exists (
    select 1
    from bookings b
    join gyms g_outra on g_outra.id = b.academia_id
    join gyms g_esta on g_esta.id = p_academia
    where b.status in ('marcada', 'dada', 'falta')
      and b.academia_id <> p_academia
      and b.inicio < v_fim + make_interval(mins => greatest(g_outra.intervalo_min, g_esta.intervalo_min))
      and b.fim + make_interval(mins => greatest(g_outra.intervalo_min, g_esta.intervalo_min)) > p_inicio
  ) then
    raise exception 'Sem tempo de deslocamento entre academias neste horário';
  end if;

  -- saldo do plano ou aula avulsa cobrada à parte
  v_saldo := saldo_aulas(v_aluno, v_local::date);
  if v_saldo is null or p_dupla then
    select * into v_plano_avulso from plans
    where tipo = case when p_dupla then 'dupla'::tipo_plano else 'avulsa'::tipo_plano end and ativo
    order by ordem limit 1;
    if v_plano_avulso.id is null then
      raise exception 'Aula avulsa indisponível. Fale com o Jayson.';
    end if;
    insert into invoices (aluno_id, tipo, descricao, vencimento, valor_centavos)
    values (
      v_aluno, v_plano_avulso.tipo::text::tipo_cobranca,
      v_plano_avulso.nome || ' · ' || to_char(v_local, 'DD/MM HH24:MI'),
      v_local::date, v_plano_avulso.preco_centavos)
    returning id into v_cobranca;
  elsif v_saldo <= 0 and not v_admin then
    raise exception 'Seu saldo de aulas deste mês acabou';
  end if;

  insert into bookings (aluno_id, inicio, fim, academia_id, dupla, cobranca_id, criado_por)
  values (v_aluno, p_inicio, v_fim, p_academia, p_dupla, v_cobranca, auth.uid())
  returning id into v_id;

  return v_id;
end $$;

-- Cancelamento: até X horas antes devolve a aula; depois perde.
create or replace function cancelar_aula(p_reserva uuid, p_devolver boolean default false)
returns status_reserva
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  b bookings;
  v_status status_reserva;
begin
  select * into s from settings where id = 1;
  select * into b from bookings where id = p_reserva for update;

  if b.id is null or (b.aluno_id <> auth.uid() and not is_admin()) then
    raise exception 'Reserva não encontrada';
  end if;
  if b.status <> 'marcada' then
    raise exception 'Esta aula não está mais marcada';
  end if;
  if not is_admin() and b.inicio <= now() then
    raise exception 'A aula já começou';
  end if;

  if (is_admin() and p_devolver) or now() <= b.inicio - make_interval(hours => s.cancelamento_horas) then
    v_status := 'cancelada';
  else
    v_status := 'cancelada_tarde';
  end if;

  update bookings set status = v_status, cancelado_em = now() where id = b.id;

  -- avulsa cancelada a tempo não é cobrada
  if v_status = 'cancelada' and b.cobranca_id is not null then
    update invoices set status = 'cancelada' where id = b.cobranca_id and status = 'aberta';
  end if;

  return v_status;
end $$;

-- Pedido de cancelamento do plano (aviso de 30 dias)
create or replace function pedir_cancelamento() returns date
language plpgsql security definer set search_path = public as $$
declare v_fim date := hora_local(now())::date + 30;
begin
  update subscriptions
     set status = 'cancelamento_pedido', cancelamento_pedido_em = now(), fim = v_fim
   where aluno_id = auth.uid() and status = 'ativa';
  if not found then
    raise exception 'Nenhum plano ativo para cancelar';
  end if;
  return v_fim;
end $$;

-- Gera as mensalidades de um mês para todas as assinaturas vigentes (botão do Jayson)
create or replace function gerar_mensalidades(p_competencia date) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_mes date := date_trunc('month', p_competencia)::date;
  v_total integer;
begin
  if not is_admin() then
    raise exception 'Sem permissão';
  end if;

  insert into invoices (aluno_id, assinatura_id, tipo, descricao, competencia, vencimento, valor_centavos)
  select s.aluno_id, s.id, 'mensalidade',
         p.nome || ' · ' || to_char(v_mes, 'MM/YYYY'),
         v_mes, v_mes + (s.dia_vencimento - 1), s.valor_centavos
  from subscriptions s
  join plans p on p.id = s.plano_id
  where s.status in ('ativa', 'cancelamento_pedido')
    and s.inicio <= (v_mes + interval '1 month - 1 day')::date
    and (s.fim is null or s.fim >= v_mes)
    and not exists (
      select 1 from invoices i
      where i.assinatura_id = s.id and i.competencia = v_mes
        and i.tipo = 'mensalidade' and i.status <> 'cancelada');

  get diagnostics v_total = row_count;
  return v_total;
end $$;

-- Funções expostas só para quem está logado
revoke execute on function saldo_aulas(uuid, date), horarios_livres(date, date),
  reservar_aula(timestamptz, uuid, boolean, uuid), cancelar_aula(uuid, boolean),
  pedir_cancelamento(), gerar_mensalidades(date)
  from public, anon;
revoke execute on function assinatura_vigente(uuid) from public, anon, authenticated;
grant execute on function saldo_aulas(uuid, date), horarios_livres(date, date),
  reservar_aula(timestamptz, uuid, boolean, uuid), cancelar_aula(uuid, boolean),
  pedir_cancelamento(), gerar_mensalidades(date)
  to authenticated;
