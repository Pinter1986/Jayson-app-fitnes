import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Ajustes, Perfil } from "./tipos";

export const ACEITES_OBRIGATORIOS = ["contrato", "termos_privacidade", "responsabilidade"] as const;

export const perfilAtual = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Perfil | null) ?? null;
});

export const ajustesAtuais = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  return data as Ajustes;
});

export async function exigirAdmin() {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/entrar");
  if (perfil.papel !== "admin") redirect("/inicio");
  return perfil;
}

// Aluno logado, ativo e com os aceites da versão atual dos textos
export async function exigirAluno() {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/entrar");
  if (perfil.papel === "admin") redirect("/admin");
  if (!(await aceitesEmDia(perfil.id))) redirect("/primeiro-acesso");
  return perfil;
}

export async function aceitesEmDia(alunoId: string) {
  const supabase = await createClient();
  const ajustes = await ajustesAtuais();
  const { data } = await supabase.from("consents").select("tipo, versao").eq("aluno_id", alunoId);
  const { data: anamnese } = await supabase.from("anamnesis").select("aluno_id").eq("aluno_id", alunoId).maybeSingle();
  if (!anamnese) return false;
  return ACEITES_OBRIGATORIOS.every((tipo) =>
    (data ?? []).some((c) => c.tipo === tipo && c.versao === ajustes.textos?.[tipo]?.versao),
  );
}
