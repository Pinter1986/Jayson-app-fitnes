// Mensagens do Supabase Auth em português (usado no servidor e no navegador)
export function traduzErroAuth(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem cadastro. Use \"Entrar\" ou \"Esqueci minha senha\".";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/rate limit|security purposes/i.test(msg)) return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (/sending (confirmation|recovery|magic link)? ?email|smtp/i.test(msg))
    return "Não foi possível enviar o e-mail de confirmação. Avise o Jayson para liberar seu acesso.";
  if (/failed to fetch|network|load failed/i.test(msg)) return "Sem conexão com o servidor. Confira a internet e tente de novo.";
  return `Não deu certo agora. Tente de novo em instantes. (detalhe: ${msg})`;
}
