-- Dados de DEMONSTRAÇÃO para testar o app sem alunos reais.
-- Rodar no SQL Editor do Supabase DEPOIS das migrações e do seed.sql.
-- Pode rodar de novo: apaga a demonstração anterior e recria com datas atualizadas.
-- Para apagar tudo: supabase/demo_remover.sql
--
-- Todos os alunos de teste usam a senha: Demo@1234
--   ana.demo@exemplo.com     plano 2x, em dia, com treinos, cargas e avaliações
--   bruno.demo@exemplo.com   plano 3x, mensalidade em atraso
--   carla.demo@exemplo.com   plano 1x, aniversário este mês, treino para trocar
--   diego.demo@exemplo.com   consultoria online
--   elisa.demo@exemplo.com   cadastro novo: plano pendente e primeiro acesso por fazer
--   felipe.demo@exemplo.com  plano 2x com cancelamento pedido

-- Remove a demonstração anterior (apaga em cascata aulas, cobranças, treinos...)
delete from auth.users where email like '%.demo@exemplo.com';

-- Cria um usuário de login já confirmado
create or replace function pg_temp.demo_usuario(p_email text, p_meta jsonb) returns uuid
language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
    extensions.crypt('Demo@1234', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', p_meta, now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text,
          jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  return v_id;
end $$;

-- Data/hora local -> timestamptz
create or replace function pg_temp.demo_hora(p_dias integer, p_hora text) returns timestamptz
language sql as $$
  select (((now() at time zone 'America/Sao_Paulo')::date + p_dias) + p_hora::time) at time zone 'America/Sao_Paulo'
$$;

do $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  mes date := date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date;
  mes_ant date := (date_trunc('month', (now() at time zone 'America/Sao_Paulo')) - interval '1 month')::date;
  ana uuid; bruno uuid; carla uuid; diego uuid; elisa uuid; felipe uuid;
  s_ana uuid; s_bruno uuid; s_carla uuid; s_diego uuid; s_felipe uuid;
  uplay uuid; premium uuid; fitway uuid; online uuid;
  p2x uuid; p3x uuid; p1x uuid; pon uuid;
  t uuid;
  versao_contrato text; versao_termos text; versao_resp text; versao_fotos text;
begin
  select id into uplay from gyms where nome = 'Uplay';
  select id into premium from gyms where nome = 'Premium';
  select id into fitway from gyms where nome = 'Fitway';
  select id into online from gyms where nome = 'Online';
  select id into p1x from plans where nome = 'Plano 1x por semana';
  select id into p2x from plans where nome = 'Plano 2x por semana';
  select id into p3x from plans where nome = 'Plano 3x por semana';
  select id into pon from plans where nome = 'Consultoria online mensal';
  if uplay is null or p2x is null then
    raise exception 'Rode o supabase/seed.sql antes da demonstração.';
  end if;

  select textos -> 'contrato' ->> 'versao', textos -> 'termos_privacidade' ->> 'versao',
         textos -> 'responsabilidade' ->> 'versao', textos -> 'fotos_acompanhamento' ->> 'versao'
    into versao_contrato, versao_termos, versao_resp, versao_fotos
  from settings where id = 1;

  -- Alunos ---------------------------------------------------------------
  ana := pg_temp.demo_usuario('ana.demo@exemplo.com', '{"nome": "Ana Souza (demo)", "whatsapp": "47999990001", "nascimento": "1995-03-20", "sexo": "F", "origem": "instagram"}');
  bruno := pg_temp.demo_usuario('bruno.demo@exemplo.com', '{"nome": "Bruno Lima (demo)", "whatsapp": "47999990002", "nascimento": "1990-07-02", "sexo": "M", "origem": "instagram"}');
  carla := pg_temp.demo_usuario('carla.demo@exemplo.com', jsonb_build_object('nome', 'Carla Mendes (demo)', 'whatsapp', '47999990003',
             'nascimento', to_char(make_date(1988, extract(month from hoje)::int, least(28, extract(day from hoje)::int + 3)), 'YYYY-MM-DD'), 'sexo', 'F', 'origem', 'outro'));
  diego := pg_temp.demo_usuario('diego.demo@exemplo.com', '{"nome": "Diego Rocha (demo)", "whatsapp": "47999990004", "nascimento": "1999-11-12", "sexo": "M", "origem": "instagram"}');
  elisa := pg_temp.demo_usuario('elisa.demo@exemplo.com', '{"nome": "Elisa Prado (demo)", "whatsapp": "47999990005", "nascimento": "1992-05-30", "sexo": "F", "origem": "instagram"}');
  felipe := pg_temp.demo_usuario('felipe.demo@exemplo.com', '{"nome": "Felipe Costa (demo)", "whatsapp": "47999990006", "nascimento": "1985-01-15", "sexo": "M", "origem": "outro"}');

  -- Carla veio por indicação da Ana
  update profiles set indicado_por = ana, origem = 'indicacao' where id = carla;
  insert into referrals (indicador_id, indicado_id) values (ana, carla);

  -- Planos ---------------------------------------------------------------
  insert into subscriptions (aluno_id, plano_id, valor_centavos, dia_vencimento, inicio, status)
  values (ana, p2x, 56000, 5, hoje - 120, 'ativa') returning id into s_ana;
  insert into subscriptions (aluno_id, plano_id, valor_centavos, dia_vencimento, inicio, status)
  values (bruno, p3x, 84000, 10, hoje - 90, 'ativa') returning id into s_bruno;
  insert into subscriptions (aluno_id, plano_id, valor_centavos, dia_vencimento, inicio, status)
  values (carla, p1x, 30000, 5, hoje - 60, 'ativa') returning id into s_carla;
  insert into subscriptions (aluno_id, plano_id, valor_centavos, dia_vencimento, inicio, status)
  values (diego, pon, 15000, 10, hoje - 45, 'ativa') returning id into s_diego;
  insert into subscriptions (aluno_id, plano_id, valor_centavos, dia_vencimento, inicio, status)
  values (elisa, p1x, 30000, 10, hoje, 'pendente');
  insert into subscriptions (aluno_id, plano_id, valor_centavos, dia_vencimento, inicio, status, cancelamento_pedido_em, fim)
  values (felipe, p2x, 56000, 10, hoje - 200, 'cancelamento_pedido', now() - interval '5 days', hoje + 25) returning id into s_felipe;

  -- Primeiro acesso já feito (menos a Elisa) -------------------------------
  insert into anamnesis (aluno_id, respostas, parq)
  select a, r, p from (values
    (ana, '{"objetivo": "Hipertrofia e definição", "historico": "Treina há 2 anos, 4x por semana", "lesoes": "Dor leve no joelho direito", "sono": "7 horas", "alimentacao": "Boa, sem acompanhamento"}'::jsonb, '{"q5": true}'::jsonb),
    (bruno, '{"objetivo": "Ganhar massa", "historico": "Voltando depois de 1 ano parado", "lesoes": "Nenhuma"}', '{}'),
    (carla, '{"objetivo": "Emagrecimento", "historico": "Iniciante", "medicamentos": "Anticoncepcional"}', '{}'),
    (diego, '{"objetivo": "Condicionamento para corrida", "historico": "Corre 3x por semana"}', '{}'),
    (felipe, '{"objetivo": "Saúde e mobilidade", "lesoes": "Hérnia lombar (L4-L5)"}', '{"q5": true}')
  ) v(a, r, p);

  insert into consents (aluno_id, tipo, versao, valor)
  select a, tipo, versao, valor
  from unnest(array[ana, bruno, carla, diego, felipe]) a
  cross join (values ('contrato', versao_contrato, 'aceito'), ('termos_privacidade', versao_termos, 'aceito'),
                     ('responsabilidade', versao_resp, 'aceito'), ('fotos_acompanhamento', versao_fotos, 'aceito')) c(tipo, versao, valor);
  insert into consents (aluno_id, tipo, versao, valor) values (ana, 'divulgacao', 'rascunho-1', 'sem_rosto');

  insert into admin_notes (aluno_id, texto) values
    (ana, 'Cuidar do joelho direito no agachamento. Gosta de treino puxado.'),
    (felipe, 'Hérnia L4-L5: evitar carga axial pesada. Pediu cancelamento por mudança de cidade.');

  -- Agenda: aulas da semana passada e dos próximos dias -------------------
  insert into bookings (aluno_id, inicio, fim, academia_id, status, criado_por)
  select a, pg_temp.demo_hora(d, h), pg_temp.demo_hora(d, h) + interval '1 hour', g, s::status_reserva, a
  from (values
    (ana, -7, '07:00', uplay, 'dada'), (ana, -5, '07:00', uplay, 'dada'), (ana, -2, '07:00', uplay, 'dada'),
    (bruno, -6, '18:00', premium, 'dada'), (bruno, -4, '18:00', premium, 'falta'), (bruno, -1, '18:00', premium, 'dada'),
    (carla, -3, '12:00', fitway, 'dada'),
    (felipe, -6, '07:00', uplay, 'dada'), (felipe, -3, '07:00', uplay, 'cancelada_tarde'),
    (ana, 1, '07:00', uplay, 'marcada'), (felipe, 1, '07:00', uplay, 'marcada'),
    (bruno, 1, '18:00', premium, 'marcada'), (carla, 2, '12:00', fitway, 'marcada'),
    (ana, 2, '07:00', uplay, 'marcada')
  ) v(a, d, h, g, s);

  -- Mensalidades: mês passado pago (Bruno em atraso), mês atual em aberto --
  insert into invoices (aluno_id, assinatura_id, tipo, descricao, competencia, vencimento, valor_centavos, status, forma, pago_em)
  select a, s, 'mensalidade', n || ' · ' || to_char(mes_ant, 'MM/YYYY'), mes_ant, mes_ant + (dia - 1), v, 'paga', f::forma_pagamento,
         (mes_ant + (dia - 2))::timestamptz
  from (values (ana, s_ana, 'Plano 2x por semana', 5, 56000, 'pix'), (carla, s_carla, 'Plano 1x por semana', 5, 30000, 'tap_to_pay'),
               (diego, s_diego, 'Consultoria online mensal', 10, 15000, 'pix'), (felipe, s_felipe, 'Plano 2x por semana', 10, 56000, 'credito')) x(a, s, n, dia, v, f);

  insert into invoices (aluno_id, assinatura_id, tipo, descricao, competencia, vencimento, valor_centavos)
  values (bruno, s_bruno, 'mensalidade', 'Plano 3x por semana · ' || to_char(mes_ant, 'MM/YYYY'), mes_ant, mes_ant + 9, 84000);

  insert into invoices (aluno_id, assinatura_id, tipo, descricao, competencia, vencimento, valor_centavos, status, forma, pago_em)
  values (ana, s_ana, 'mensalidade', 'Plano 2x por semana · ' || to_char(mes, 'MM/YYYY'), mes, mes + 4, 56000, 'paga', 'pix', now() - interval '1 day');

  insert into invoices (aluno_id, assinatura_id, tipo, descricao, competencia, vencimento, valor_centavos)
  select a, s, 'mensalidade', n || ' · ' || to_char(mes, 'MM/YYYY'), mes, mes + (dia - 1), v
  from (values (bruno, s_bruno, 'Plano 3x por semana', 10, 84000), (carla, s_carla, 'Plano 1x por semana', 5, 30000),
               (diego, s_diego, 'Consultoria online mensal', 10, 15000), (felipe, s_felipe, 'Plano 2x por semana', 10, 56000)) x(a, s, n, dia, v);

  insert into invoices (aluno_id, tipo, descricao, vencimento, valor_centavos, status, forma, parcelas, taxa_centavos, pago_em)
  values (ana, 'avaliacao', 'Avaliação postural e antropométrica', hoje - 100, 25000, 'paga', 'credito', 3, 1400, now() - interval '100 days');

  -- Biblioteca de exercícios (só cria os que não existem) -------------------
  insert into exercises (nome, grupo, tecnica, observacao)
  select v.nome, v.grupo, v.tecnica, v.obs
  from (values
    ('Supino reto com barra', 'Peito', null, 'Escápulas encaixadas, pés firmes no chão'),
    ('Supino inclinado com halteres', 'Peito', null, null),
    ('Crucifixo na máquina', 'Peito', 'drop-set', null),
    ('Puxada frontal', 'Costas', null, 'Puxe com os cotovelos, peito para cima'),
    ('Remada curvada', 'Costas', null, 'Coluna neutra'),
    ('Remada baixa no cabo', 'Costas', null, null),
    ('Agachamento livre', 'Pernas', null, 'Joelhos na direção dos pés'),
    ('Leg press 45°', 'Pernas', null, null),
    ('Cadeira extensora', 'Pernas', 'rest-pause', null),
    ('Mesa flexora', 'Pernas', null, null),
    ('Stiff com halteres', 'Pernas', null, 'Quadril para trás, joelho levemente flexionado'),
    ('Elevação pélvica', 'Glúteos', null, null),
    ('Desenvolvimento com halteres', 'Ombros', null, null),
    ('Elevação lateral', 'Ombros', 'bi-set', null),
    ('Rosca direta', 'Bíceps', null, null),
    ('Tríceps na polia', 'Tríceps', null, null),
    ('Prancha', 'Core', null, 'Abdômen e glúteos contraídos')
  ) v(nome, grupo, tecnica, obs)
  where not exists (select 1 from exercises e where e.nome = v.nome);

  -- Treinos ----------------------------------------------------------------
  -- Ana: A (inferiores) e B (superiores), publicados há 12 dias, com cargas registradas
  insert into workouts (aluno_id, nome, observacao, ordem, publicado_em) values (ana, 'A', 'Inferiores', 1, now() - interval '12 days') returning id into t;
  insert into workout_items (treino_id, exercicio_id, ordem, series, repeticoes, carga_sugerida, descanso_seg, tecnica)
  select t, e.id, v.o, v.s, v.r, v.c, v.d, v.tec
  from (values (1, 'Agachamento livre', 4, '8 a 10', '40 kg', 90, null), (2, 'Leg press 45°', 4, '10 a 12', '120 kg', 75, null),
               (3, 'Cadeira extensora', 3, '12', '35 kg', 60, 'rest-pause'), (4, 'Stiff com halteres', 3, '10', '14 kg cada', 60, null),
               (5, 'Elevação pélvica', 4, '12', '60 kg', 60, null)) v(o, n, s, r, c, d, tec)
  join exercises e on e.nome = v.n;

  -- cargas subindo ao longo de 4 semanas (gráfico de evolução)
  insert into workout_logs (aluno_id, treino_id, item_id, data, carga_kg, repeticoes, esforco)
  select ana, t, i.id, hoje - (7 * sem), base + (4 - sem) * passo, 10, 7 + (sem % 2)
  from workout_items i
  join exercises e on e.id = i.exercicio_id
  join (values ('Agachamento livre', 32.5, 2.5), ('Leg press 45°', 100.0, 5.0), ('Elevação pélvica', 50.0, 5.0)) x(n, base, passo) on x.n = e.nome
  cross join generate_series(1, 4) sem
  where i.treino_id = t;
  insert into workout_logs (aluno_id, treino_id, data, cardio_tipo, cardio_min, cardio_km)
  values (ana, t, hoje - 2, 'Esteira', 20, 2.8), (ana, t, hoje - 7, 'Bike', 15, null);

  insert into workouts (aluno_id, nome, observacao, ordem, publicado_em) values (ana, 'B', 'Superiores', 2, now() - interval '12 days') returning id into t;
  insert into workout_items (treino_id, exercicio_id, ordem, series, repeticoes, carga_sugerida, descanso_seg, tecnica)
  select t, e.id, v.o, v.s, v.r, v.c, v.d, v.tec
  from (values (1, 'Supino inclinado com halteres', 4, '10', '12 kg cada', 75, null), (2, 'Puxada frontal', 4, '10', '40 kg', 75, null),
               (3, 'Desenvolvimento com halteres', 3, '10', '8 kg cada', 60, null), (4, 'Elevação lateral', 3, '12', '5 kg', 45, 'bi-set'),
               (5, 'Prancha', 3, '40s', null, 45, null)) v(o, n, s, r, c, d, tec)
  join exercises e on e.nome = v.n;

  -- Bruno: A/B/C; Carla: full body antigo (aparece em "treinos para trocar"); Diego: online
  insert into workouts (aluno_id, nome, observacao, ordem, publicado_em) values (bruno, 'A', 'Peito e tríceps', 1, now() - interval '20 days') returning id into t;
  insert into workout_items (treino_id, exercicio_id, ordem, series, repeticoes, carga_sugerida, descanso_seg)
  select t, e.id, v.o, 4, '8 a 10', null, 90 from (values (1, 'Supino reto com barra'), (2, 'Crucifixo na máquina'), (3, 'Tríceps na polia')) v(o, n) join exercises e on e.nome = v.n;
  insert into workouts (aluno_id, nome, observacao, ordem, publicado_em) values (bruno, 'B', 'Costas e bíceps', 2, now() - interval '20 days') returning id into t;
  insert into workout_items (treino_id, exercicio_id, ordem, series, repeticoes, descanso_seg)
  select t, e.id, v.o, 4, '8 a 10', 90 from (values (1, 'Puxada frontal'), (2, 'Remada curvada'), (3, 'Rosca direta')) v(o, n) join exercises e on e.nome = v.n;
  insert into workouts (aluno_id, nome, observacao, ordem, publicado_em) values (bruno, 'C', 'Pernas e ombros', 3, now() - interval '20 days') returning id into t;
  insert into workout_items (treino_id, exercicio_id, ordem, series, repeticoes, descanso_seg)
  select t, e.id, v.o, 4, '10', 90 from (values (1, 'Agachamento livre'), (2, 'Mesa flexora'), (3, 'Elevação lateral')) v(o, n) join exercises e on e.nome = v.n;

  insert into workouts (aluno_id, nome, observacao, ordem, publicado_em) values (carla, 'Full body', 'Adaptação', 1, now() - interval '45 days') returning id into t;
  insert into workout_items (treino_id, exercicio_id, ordem, series, repeticoes, descanso_seg)
  select t, e.id, v.o, 3, '12 a 15', 60 from (values (1, 'Leg press 45°'), (2, 'Puxada frontal'), (3, 'Supino inclinado com halteres'), (4, 'Prancha')) v(o, n) join exercises e on e.nome = v.n;

  insert into workouts (aluno_id, nome, observacao, ordem, publicado_em) values (diego, 'Força para corrida', 'Fazer 2x na semana, longe do treino longo', 1, now() - interval '8 days') returning id into t;
  insert into workout_items (treino_id, exercicio_id, ordem, series, repeticoes, descanso_seg)
  select t, e.id, v.o, 3, '12', 60 from (values (1, 'Agachamento livre'), (2, 'Stiff com halteres'), (3, 'Elevação pélvica'), (4, 'Prancha')) v(o, n) join exercises e on e.nome = v.n;

  -- Modelo reutilizável (só cria se não existir)
  if not exists (select 1 from workouts where aluno_id is null and nome = 'Modelo · Iniciante full body') then
    insert into workouts (aluno_id, nome, observacao) values (null, 'Modelo · Iniciante full body', 'Primeiras 4 semanas') returning id into t;
    insert into workout_items (treino_id, exercicio_id, ordem, series, repeticoes, descanso_seg)
    select t, e.id, v.o, 3, '12 a 15', 60 from (values (1, 'Leg press 45°'), (2, 'Puxada frontal'), (3, 'Supino inclinado com halteres'), (4, 'Remada baixa no cabo'), (5, 'Prancha')) v(o, n) join exercises e on e.nome = v.n;
  end if;

  -- Avaliações: Ana com 2 (gráfico de peso e gordura; a última vence a reavaliação)
  insert into assessments (aluno_id, data, peso_kg, altura_cm, gordura_pct, observacao) values
    (ana, hoje - 200, 68.4, 165, 27.1, 'Avaliação inicial.'),
    (ana, hoje - 100, 66.2, 165, 24.6, 'Boa evolução: -2,2 kg e -2,5 pontos de gordura.'),
    (bruno, hoje - 60, 82.0, 178, 18.3, null);
end $$;

select 'Demonstração criada. Senha de todos: Demo@1234' as resultado;
