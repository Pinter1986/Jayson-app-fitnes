"use client";

import { useState } from "react";
import { Mensagem, type Resultado } from "@/components/Formulario";
import { Rotulo } from "@/components/ui";
import { traduzErroAuth } from "@/lib/erros-auth";
import { createClient } from "@/lib/supabase/client";

// Login feito no navegador: grava o cookie da sessão direto e depois carrega a página inteira.
// Mais robusto no iPhone, onde o Safari pode manter em cache uma versão antiga da página.
export default function FormEntrar() {
  const [estado, setEstado] = useState<Resultado>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    setEnviando(true);
    setEstado(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(dados.get("email") ?? "").trim().toLowerCase(),
        password: String(dados.get("senha") ?? ""),
      });
      if (error) throw error;
      const { data: perfil } = await supabase.from("profiles").select("papel").eq("id", data.user.id).single();
      window.location.assign(perfil?.papel === "admin" ? "/admin" : "/inicio");
    } catch (erro) {
      setEstado({ erro: traduzErroAuth(erro instanceof Error ? erro.message : String(erro)) });
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="space-y-4">
      <Rotulo texto="E-mail">
        <input className="campo" name="email" type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
      </Rotulo>
      <Rotulo texto="Senha">
        <input className="campo" name="senha" type="password" autoComplete="current-password" autoCapitalize="none" autoCorrect="off" required />
      </Rotulo>
      <button type="submit" disabled={enviando} className="btn btn-primario w-full">
        {enviando ? "Entrando…" : "Entrar"}
      </button>
      <Mensagem estado={estado} />
    </form>
  );
}
