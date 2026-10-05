-- Dados iniciais. Tudo editável depois em Ajustes; nada de preço fixo no código.

insert into plans (nome, tipo, preco_centavos, aulas_semana, aulas_mes, meses, ordem, descricao) values
  ('Plano 1x por semana', 'presencial', 30000, 1, 4, 1, 1, 'Aula presencial de 1 hora, uma vez por semana'),
  ('Plano 2x por semana', 'presencial', 56000, 2, 9, 1, 2, 'Aula presencial de 1 hora, duas vezes por semana'),
  ('Plano 3x por semana', 'presencial', 84000, 3, 13, 1, 3, 'Aula presencial de 1 hora, três vezes por semana'),
  ('Aula avulsa individual', 'avulsa', 8500, null, null, 1, 4, 'Uma aula presencial de 1 hora'),
  ('Aula em dupla', 'dupla', 9000, null, null, 1, 5, 'Aula de 1 hora para duas pessoas (valor por pessoa)'),
  ('Consultoria online mensal', 'online', 15000, null, null, 1, 6, 'Treino no app, vídeos e ajuste mensal'),
  ('Consultoria online trimestral', 'online', 30000, null, null, 3, 7, 'Três meses de consultoria online'),
  ('Avaliação postural e antropométrica', 'avaliacao', 25000, null, null, 1, 8, 'Simetrografia, 7 dobras e medidas');

insert into gyms (nome, intervalo_min, ordem) values
  ('Uplay', 30, 1),
  ('Premium', 30, 2),
  ('Fitway', 30, 3),
  ('Online', 0, 4);

-- 5h às 22h todos os dias (a confirmar com o Jayson)
insert into availability (dia_semana, hora_inicio, hora_fim)
select d, '05:00', '22:00' from generate_series(0, 6) d;

insert into settings (id, taxas_cartao, taxas_sao_exemplo, whatsapp, combinados, textos) values (
  1,
  '{"debito": 1.37, "credito": {"1": 3.15, "2": 4.54, "3": 5.33, "4": 6.11, "5": 6.88, "6": 7.64,
     "7": 8.39, "8": 9.13, "9": 9.86, "10": 10.58, "11": 11.29, "12": 11.99}}',
  true,
  '554732716304',
  'Chegue 5 minutos antes. Traga toalha e garrafa de água. Celular só para registrar o treino.',
  '{
    "contrato": {"versao": "rascunho-1", "texto": "TEXTO PROVISÓRIO — revisar com advogado antes de publicar.\n\nContrato de prestação de serviço de personal trainer entre Jayson Lucian (CREF 018556-G/SC) e o aluno. Cobre o plano escolhido, vencimento no dia 5 ou 10, multa de 2% por atraso, cancelamento com aviso de 30 dias sem fidelidade, regra de faltas (falta sem aviso perde a aula; cancelamento até 24 horas antes não perde) e uso de imagem conforme autorização separada."},
    "termos_privacidade": {"versao": "rascunho-1", "texto": "TEXTO PROVISÓRIO — revisar com advogado.\n\nSeus dados (cadastro, anamnese, medidas e fotos) são usados só para o acompanhamento do treino. Ficam visíveis apenas para você e para o Jayson. Você pode baixar seus dados ou pedir a exclusão da conta pelo Perfil."},
    "responsabilidade": {"versao": "rascunho-1", "texto": "TEXTO PROVISÓRIO — revisar com advogado.\n\nDeclaro que respondi com verdade ao questionário de prontidão para atividade física (PAR-Q) e que informarei qualquer mudança no meu estado de saúde."},
    "fotos_acompanhamento": {"versao": "rascunho-1", "texto": "Autorizo fotos de frente, lado e costas nas avaliações, vistas só por mim e pelo Jayson, para acompanhar minha evolução."},
    "divulgacao": {"versao": "rascunho-1", "texto": "Autorização opcional para usar minhas fotos de antes e depois na divulgação. Posso retirar quando quiser."},
    "vendas_titulo": "Quer evoluir?",
    "vendas_bio": "Treinador há mais de 12 anos, especializado em biomecânica e bodybuilder coach."
  }'
);
