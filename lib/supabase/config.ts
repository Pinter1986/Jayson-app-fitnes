// Endereço e chave PÚBLICA do Supabase. Não são segredo: vão para o navegador de todo visitante
// e quem protege os dados é o RLS do banco. Ficam no código como padrão para o app não depender
// das variáveis da Vercel; se NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY existirem, elas têm prioridade.
// A chave secreta (SUPABASE_SERVICE_ROLE_KEY) NUNCA vai aqui: fica só na Vercel.
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://sepwmihbikccbulxmbva.supabase.co").trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Zfh-hapFR43E95zZVO3m4A_FtHJk-fm").trim();
