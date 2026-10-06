-- Apaga os alunos de DEMONSTRAÇÃO e tudo ligado a eles
-- (aulas, cobranças, treinos, cargas, avaliações, aceites).
-- Não mexe em alunos reais, planos, ajustes nem na biblioteca de exercícios.
delete from auth.users where email like '%.demo@exemplo.com';

-- Opcional: apagar também o treino modelo criado pela demonstração
-- delete from workouts where aluno_id is null and nome = 'Modelo · Iniciante full body';

select 'Demonstração removida' as resultado;
