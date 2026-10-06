import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

const PUBLICAS = ["/", "/entrar", "/cadastro", "/esqueci-senha", "/auth"];

function ehPublica(path: string) {
  return PUBLICAS.some((p) => (p === "/" ? path === "/" : path === p || path.startsWith(p + "/")));
}

// Sem as chaves do Supabase o app não funciona: mostra o motivo em vez de um erro 500 genérico
function faltaConfiguracao(faltando: string[]) {
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Configuração pendente</title>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0E0E10;color:#f5f5f5;font-family:system-ui,sans-serif;padding:24px">
<div style="max-width:440px"><h1 style="font-size:20px">Configuração pendente</h1>
<p>Faltam estas variáveis de ambiente na Vercel (Settings › Environment Variables):</p>
<ul>${faltando.map((n) => `<li><code>${n}</code></li>`).join("")}</ul>
<p>Depois de cadastrar, faça um <b>Redeploy</b>.</p></div></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function updateSession(request: NextRequest) {
  const url = SUPABASE_URL;
  const chave = SUPABASE_ANON_KEY;
  if (!url || !chave) {
    return faltaConfiguracao([
      ...(url ? [] : ["NEXT_PUBLIC_SUPABASE_URL"]),
      ...(chave ? [] : ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]),
    ]);
  }
  if (!/^https?:\/\/[^\s/]+\/?$/.test(url)) {
    return faltaConfiguracao([
      "NEXT_PUBLIC_SUPABASE_URL está com valor inválido: use só o endereço, no formato https://xxxx.supabase.co (sem espaços e sem /rest/v1)",
    ]);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    chave,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  let user = null;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    // Supabase fora do ar ou URL errada: trata como visitante
  }

  const path = request.nextUrl.pathname;
  if (!user && !ehPublica(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
