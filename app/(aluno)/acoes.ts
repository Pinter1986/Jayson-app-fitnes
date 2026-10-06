"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Resultado } from "@/components/Formulario";
import { perfilAtual } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";

const limpa = (e: { message: string }) => e.message.replace(/^.*?: /, "");

export async function reservar(inicio: string, academiaId: string, dupla: boolean): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reservar_aula", { p_inicio: inicio, p_academia: academiaId, p_dupla: dupla });
  if (error) return { erro: limpa(error) };
  revalidatePath("/agenda");
  revalidatePath("/inicio");
  return { ok: "Aula marcada!" };
}

export async function cancelar(reservaId: string): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancelar_aula", { p_reserva: reservaId });
  if (error) return { erro: limpa(error) };
  revalidatePath("/agenda");
  revalidatePath("/inicio");
  return { ok: data === "cancelada" ? "Aula cancelada. Ela volta para o seu saldo." : "Aula cancelada com menos de 24h: ela conta como dada." };
}

export async function registrarSerie(_: Resultado, dados: FormData): Promise<Resultado> {
  const perfil = await perfilAtual();
  if (!perfil) return { erro: "Faça login" };
  const num = (c: string) => {
    const v = String(dados.get(c) ?? "").replace(",", ".").trim();
    return v === "" ? null : Number(v);
  };
  const itemId = String(dados.get("item_id") ?? "") || null;
  const registro = {
    aluno_id: perfil.id,
    treino_id: String(dados.get("treino_id")),
    item_id: itemId,
    carga_kg: num("carga_kg"),
    repeticoes: num("repeticoes"),
    esforco: num("esforco"),
    cardio_tipo: String(dados.get("cardio_tipo") ?? "").trim() || null,
    cardio_min: num("cardio_min"),
    cardio_km: num("cardio_km"),
    observacao: String(dados.get("observacao") ?? "").trim() || null,
  };
  if (itemId && registro.carga_kg == null && registro.repeticoes == null) return { erro: "Informe a carga ou as repetições." };
  if (!itemId && !registro.cardio_tipo && registro.cardio_min == null) return { erro: "Informe o cardio." };

  const supabase = await createClient();
  const { error } = await supabase.from("workout_logs").insert(registro);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath(`/treino/${registro.treino_id}`);
  return { ok: "Registrado!" };
}

export async function salvarPerfil(_: Resultado, dados: FormData): Promise<Resultado> {
  const perfil = await perfilAtual();
  if (!perfil) return { erro: "Faça login" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      nome: String(dados.get("nome") ?? "").trim() || perfil.nome,
      whatsapp: String(dados.get("whatsapp") ?? "").replace(/\D/g, "") || null,
      nascimento: String(dados.get("nascimento") ?? "") || null,
      avisos_email: dados.get("avisos_email") === "on",
      avisos_whatsapp: dados.get("avisos_whatsapp") === "on",
    })
    .eq("id", perfil.id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/perfil");
  return { ok: "Dados salvos." };
}

export async function trocarTema() {
  const jar = await cookies();
  const atual = jar.get("tema")?.value === "claro" ? "claro" : "escuro";
  jar.set("tema", atual === "claro" ? "escuro" : "claro", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function pedirCancelamento(): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("pedir_cancelamento");
  if (error) return { erro: limpa(error) };
  revalidatePath("/perfil");
  revalidatePath("/financeiro");
  const fim = new Date(String(data) + "T12:00:00").toLocaleDateString("pt-BR");
  return { ok: `Pedido registrado. Seu plano segue ativo até ${fim} (aviso de 30 dias).` };
}
