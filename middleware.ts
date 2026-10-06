import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (erro) {
    // Nunca derrubar a página por falha na checagem de sessão: as páginas protegidas
    // conferem o login de novo no servidor (exigirAluno / exigirAdmin).
    console.error("middleware", erro);
    return NextResponse.next({ request });
  }
}

export const config = {
  // Node.js em vez de Edge: mais estável com o cliente do Supabase
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)"],
};
