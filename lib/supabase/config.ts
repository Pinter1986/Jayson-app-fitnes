// Endereço e chave PÚBLICA (publishable) do Supabase. Não são segredo: vão para o navegador de
// todo visitante e quem protege os dados é o RLS do banco. Ficam fixos no código de propósito:
// as variáveis NEXT_PUBLIC_* da Vercel chegaram com valor errado ("Invalid API key").
// A chave secreta (SUPABASE_SERVICE_ROLE_KEY) NUNCA vai aqui: fica só na Vercel.
export const SUPABASE_URL = "https://sepwmihbikccbulxmbva.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_Zfh-hapFR43E95zZVO3m4A_FtHJk-fm";
