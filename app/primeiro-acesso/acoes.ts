"use server";

import { redirect } from "next/navigation";
import type { Resultado } from "@/components/Formulario";
import { PARQ, PERGUNTAS } from "@/lib/anamnese";
import { ACEITES_OBRIGATORIOS, ajustesAtuais, perfilAtual } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";

export async function concluirPrimeiroAcesso(_: Resultado, dados: FormData): Promise<Resultado> {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/entrar");
  const ajustes = await ajustesAtuais();

  const parq = Object.fromEntries(PARQ.map((_, i) => [`q${i + 1}`, dados.get(`parq_${i}`) === "sim"]));
  if (PARQ.some((_, i) => !dados.get(`parq_${i}`))) return { erro: "Responda todas as perguntas do PAR-Q." };
  const respostas = Object.fromEntries(PERGUNTAS.map((p) => [p.id, String(dados.get(p.id) ?? "").trim()]));

  for (const tipo of ACEITES_OBRIGATORIOS) {
    if (dados.get(`aceite_${tipo}`) !== "on") return { erro: "Para continuar, aceite o contrato, os termos e o termo de responsabilidade." };
  }

  const supabase = await createClient();
  const { error: e1 } = await supabase
    .from("anamnesis")
    .upsert({ aluno_id: perfil.id, respostas, parq, atualizado_em: new Date().toISOString() });
  if (e1) return { erro: "Não foi possível salvar a anamnese. Tente de novo." };

  const aceites: { aluno_id: string; tipo: string; versao: string; valor: string }[] = ACEITES_OBRIGATORIOS.map((tipo) => ({
    aluno_id: perfil.id,
    tipo,
    versao: ajustes.textos?.[tipo]?.versao ?? "sem-versao",
    valor: "aceito",
  }));
  aceites.push({
    aluno_id: perfil.id,
    tipo: "fotos_acompanhamento",
    versao: ajustes.textos?.fotos_acompanhamento?.versao ?? "sem-versao",
    valor: dados.get("aceite_fotos") === "on" ? "aceito" : "recusado",
  });
  aceites.push({
    aluno_id: perfil.id,
    tipo: "divulgacao",
    versao: ajustes.textos?.divulgacao?.versao ?? "sem-versao",
    valor: String(dados.get("divulgacao") ?? "nao"),
  });

  const { error: e2 } = await supabase.from("consents").insert(aceites);
  if (e2) return { erro: "Não foi possível registrar os aceites. Tente de novo." };

  redirect("/inicio");
}
