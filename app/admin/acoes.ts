"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Resultado } from "@/components/Formulario";
import { paraCentavos } from "@/lib/formato";
import { exigirAdmin } from "@/lib/sessao";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const txt = (d: FormData, c: string) => String(d.get(c) ?? "").trim();
const nulo = (d: FormData, c: string) => txt(d, c) || null;
const num = (d: FormData, c: string) => (txt(d, c) === "" ? null : Number(txt(d, c).replace(",", ".")));
const limpa = (e: { message: string }) => e.message.replace(/^.*?: /, "");

async function db() {
  await exigirAdmin();
  return createClient();
}

// Alunos ------------------------------------------------------------------
export async function novoAluno(_: Resultado, d: FormData): Promise<Resultado> {
  await exigirAdmin();
  const email = txt(d, "email").toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { erro: "Falta configurar SUPABASE_SERVICE_ROLE_KEY na Vercel." };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID() + "Aa1!",
    user_metadata: {
      nome: txt(d, "nome"),
      whatsapp: txt(d, "whatsapp").replace(/\D/g, ""),
      nascimento: txt(d, "nascimento"),
      sexo: txt(d, "sexo"),
      origem: "importado",
    },
  });
  if (error) return { erro: /already/i.test(error.message) ? "Este e-mail já tem cadastro." : error.message };

  const planoId = txt(d, "plano_id");
  if (planoId) {
    const supabase = await createClient();
    const { error: e2 } = await supabase.from("subscriptions").insert({
      aluno_id: data.user.id,
      plano_id: planoId,
      valor_centavos: paraCentavos(txt(d, "valor")),
      dia_vencimento: Number(txt(d, "dia_vencimento") || 10),
      inicio: txt(d, "inicio") || undefined,
      status: "ativa",
    });
    if (e2) return { erro: "Aluno criado, mas o plano não foi salvo: " + e2.message };
  }
  revalidatePath("/admin/alunos");
  redirect(`/admin/alunos/${data.user.id}?novo=1`);
}

export async function salvarAluno(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const id = txt(d, "id");
  const { error } = await supabase
    .from("profiles")
    .update({
      nome: txt(d, "nome"),
      whatsapp: nulo(d, "whatsapp")?.replace(/\D/g, "") ?? null,
      nascimento: nulo(d, "nascimento"),
      sexo: nulo(d, "sexo"),
      ativo: d.get("ativo") === "on",
    })
    .eq("id", id);
  if (error) return { erro: error.message };
  const { error: e2 } = await supabase.from("admin_notes").upsert({ aluno_id: id, texto: txt(d, "notas"), atualizado_em: new Date().toISOString() });
  if (e2) return { erro: e2.message };
  revalidatePath(`/admin/alunos/${id}`);
  return { ok: "Ficha salva." };
}

export async function salvarAssinatura(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const alunoId = txt(d, "aluno_id");
  const id = txt(d, "id");
  const dados = {
    aluno_id: alunoId,
    plano_id: txt(d, "plano_id"),
    valor_centavos: paraCentavos(txt(d, "valor")),
    dia_vencimento: Number(txt(d, "dia_vencimento") || 10),
    inicio: txt(d, "inicio"),
    status: txt(d, "status") as "pendente" | "ativa" | "cancelamento_pedido" | "encerrada",
    fim: nulo(d, "fim"),
  };
  if (!dados.plano_id) return { erro: "Escolha o plano." };
  const { error } = id
    ? await supabase.from("subscriptions").update(dados).eq("id", id)
    : await supabase.from("subscriptions").insert(dados);
  if (error) return { erro: /subscriptions_uma_viva/.test(error.message) ? "O aluno já tem um plano ativo. Encerre o atual antes." : error.message };
  revalidatePath(`/admin/alunos/${alunoId}`);
  return { ok: "Plano salvo." };
}

// Agenda ------------------------------------------------------------------
export async function marcarParaAluno(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const inicio = new Date(`${txt(d, "dia")}T${txt(d, "hora")}:00-03:00`).toISOString();
  const { error } = await supabase.rpc("reservar_aula", {
    p_inicio: inicio,
    p_academia: txt(d, "academia_id"),
    p_dupla: d.get("dupla") === "on",
    p_aluno: txt(d, "aluno_id"),
  });
  if (error) return { erro: limpa(error) };
  revalidatePath("/admin/agenda");
  revalidatePath("/admin");
  return { ok: "Aula marcada." };
}

export async function mudarStatusAula(id: string, status: "dada" | "falta" | "cancelar" | "cancelar_devolver"): Promise<Resultado> {
  const supabase = await db();
  if (status === "cancelar" || status === "cancelar_devolver") {
    const { error } = await supabase.rpc("cancelar_aula", { p_reserva: id, p_devolver: status === "cancelar_devolver" });
    if (error) return { erro: limpa(error) };
  } else {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return { erro: error.message };
  }
  revalidatePath("/admin/agenda");
  revalidatePath("/admin");
  return { ok: "Atualizado." };
}

export async function bloquear(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const dia = txt(d, "dia");
  const ate = txt(d, "ate_dia") || dia;
  const { error } = await supabase.from("availability_blocks").insert({
    inicio: new Date(`${dia}T${txt(d, "de") || "00:00"}:00-03:00`).toISOString(),
    fim: new Date(`${ate}T${txt(d, "ate") || "23:59"}:00-03:00`).toISOString(),
    motivo: nulo(d, "motivo"),
  });
  if (error) return { erro: "Período inválido." };
  revalidatePath("/admin/agenda");
  return { ok: "Horário bloqueado." };
}

export async function desbloquear(id: string) {
  const supabase = await db();
  await supabase.from("availability_blocks").delete().eq("id", id);
  revalidatePath("/admin/agenda");
}

// Treinos -----------------------------------------------------------------
export async function novoTreino(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const alunoId = nulo(d, "aluno_id");
  const copiarDe = nulo(d, "copiar_de");
  const { data: novo, error } = await supabase
    .from("workouts")
    .insert({ aluno_id: alunoId, nome: txt(d, "nome") || "A", observacao: nulo(d, "observacao") })
    .select("id")
    .single();
  if (error) return { erro: error.message };

  if (copiarDe) {
    const { data: itens } = await supabase.from("workout_items").select("*").eq("treino_id", copiarDe);
    if (itens?.length) {
      await supabase.from("workout_items").insert(
        itens.map((i) => ({
          treino_id: novo.id,
          exercicio_id: i.exercicio_id,
          ordem: i.ordem,
          series: i.series,
          repeticoes: i.repeticoes,
          carga_sugerida: i.carga_sugerida,
          descanso_seg: i.descanso_seg,
          tecnica: i.tecnica,
          observacao: i.observacao,
        })),
      );
    }
  }
  revalidatePath("/admin/treinos");
  redirect(`/admin/treinos/${novo.id}`);
}

export async function salvarTreino(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const id = txt(d, "id");
  const { error } = await supabase
    .from("workouts")
    .update({
      nome: txt(d, "nome"),
      observacao: nulo(d, "observacao"),
      ativo: d.get("ativo") === "on",
      ordem: Number(txt(d, "ordem") || 0),
      ...(d.get("publicar") === "on" ? { publicado_em: new Date().toISOString() } : {}),
    })
    .eq("id", id);
  if (error) return { erro: error.message };
  revalidatePath(`/admin/treinos/${id}`);
  return { ok: d.get("publicar") === "on" ? "Treino publicado como novo." : "Treino salvo." };
}

export async function apagarTreino(id: string, voltarPara: string) {
  const supabase = await db();
  await supabase.from("workouts").delete().eq("id", id);
  revalidatePath("/admin/treinos");
  redirect(voltarPara);
}

export async function salvarItem(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const treinoId = txt(d, "treino_id");
  const id = txt(d, "id");
  const dados = {
    treino_id: treinoId,
    exercicio_id: txt(d, "exercicio_id"),
    series: num(d, "series"),
    repeticoes: nulo(d, "repeticoes"),
    carga_sugerida: nulo(d, "carga_sugerida"),
    descanso_seg: num(d, "descanso_seg"),
    tecnica: nulo(d, "tecnica"),
    observacao: nulo(d, "observacao"),
    ordem: Number(txt(d, "ordem") || 0),
  };
  if (!dados.exercicio_id) return { erro: "Escolha o exercício." };
  const { error } = id ? await supabase.from("workout_items").update(dados).eq("id", id) : await supabase.from("workout_items").insert(dados);
  if (error) return { erro: error.message };
  revalidatePath(`/admin/treinos/${treinoId}`);
  return { ok: id ? "Exercício atualizado." : "Exercício adicionado." };
}

export async function apagarItem(id: string, treinoId: string) {
  const supabase = await db();
  await supabase.from("workout_items").delete().eq("id", id);
  revalidatePath(`/admin/treinos/${treinoId}`);
}

export async function salvarExercicio(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const id = txt(d, "id");
  const dados = {
    nome: txt(d, "nome"),
    grupo: nulo(d, "grupo"),
    video_url: nulo(d, "video_url"),
    tecnica: nulo(d, "tecnica"),
    observacao: nulo(d, "observacao"),
    ativo: id ? d.get("ativo") === "on" : true,
  };
  if (!dados.nome) return { erro: "Informe o nome." };
  const { error } = id ? await supabase.from("exercises").update(dados).eq("id", id) : await supabase.from("exercises").insert(dados);
  if (error) return { erro: error.message };
  revalidatePath("/admin/exercicios");
  return { ok: "Exercício salvo." };
}

// Financeiro --------------------------------------------------------------
export async function gerarMensalidades(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const { data, error } = await supabase.rpc("gerar_mensalidades", { p_competencia: txt(d, "mes") + "-01" });
  if (error) return { erro: limpa(error) };
  revalidatePath("/admin/financeiro");
  return { ok: data ? `${data} mensalidade(s) gerada(s).` : "Todas as mensalidades do mês já existiam." };
}

export async function registrarPagamento(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paga",
      forma: txt(d, "forma"),
      parcelas: Number(txt(d, "parcelas") || 1),
      multa_centavos: paraCentavos(txt(d, "multa") || "0"),
      taxa_centavos: paraCentavos(txt(d, "taxa") || "0"),
      pago_em: new Date(`${txt(d, "pago_em")}T12:00:00-03:00`).toISOString(),
    })
    .eq("id", txt(d, "id"));
  if (error) return { erro: error.message };
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  return { ok: "Pagamento registrado." };
}

export async function mudarCobranca(id: string, status: "aberta" | "cancelada") {
  const supabase = await db();
  await supabase
    .from("invoices")
    .update({ status, ...(status === "aberta" ? { pago_em: null, forma: null } : {}) })
    .eq("id", id);
  revalidatePath("/admin/financeiro");
}

export async function novaCobranca(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const { error } = await supabase.from("invoices").insert({
    aluno_id: txt(d, "aluno_id"),
    tipo: txt(d, "tipo") || "outro",
    descricao: txt(d, "descricao"),
    vencimento: txt(d, "vencimento"),
    valor_centavos: paraCentavos(txt(d, "valor")),
  });
  if (error) return { erro: error.message };
  revalidatePath("/admin/financeiro");
  return { ok: "Cobrança criada." };
}

// Ajustes -----------------------------------------------------------------
export async function salvarAjustes(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const { data: atual } = await supabase.from("settings").select("textos").eq("id", 1).single();
  const credito: Record<string, number> = {};
  for (let n = 1; n <= 12; n++) credito[String(n)] = Number(txt(d, `credito_${n}`).replace(",", ".") || 0);

  const { error } = await supabase
    .from("settings")
    .update({
      duracao_aula_min: Number(txt(d, "duracao_aula_min")),
      alunos_por_horario: Number(txt(d, "alunos_por_horario")),
      abertura_dias: Number(txt(d, "abertura_dias")),
      antecedencia_min_horas: Number(txt(d, "antecedencia_min_horas")),
      cancelamento_horas: Number(txt(d, "cancelamento_horas")),
      multa_pct: num(d, "multa_pct") ?? 0,
      juros_mes_pct: num(d, "juros_mes_pct") ?? 0,
      taxas_cartao: { debito: num(d, "debito") ?? 0, credito },
      taxas_sao_exemplo: d.get("taxas_sao_exemplo") === "on",
      whatsapp: nulo(d, "whatsapp")?.replace(/\D/g, "") ?? null,
      chave_pix: nulo(d, "chave_pix"),
      combinados: txt(d, "combinados"),
      textos: { ...(atual?.textos ?? {}), vendas_titulo: txt(d, "vendas_titulo"), vendas_bio: txt(d, "vendas_bio") },
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { ok: "Ajustes salvos. Valem na hora." };
}

export async function salvarTextoLegal(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const chave = txt(d, "chave");
  const { data: atual } = await supabase.from("settings").select("textos").eq("id", 1).single();
  const textos = { ...(atual?.textos ?? {}), [chave]: { versao: txt(d, "versao"), texto: txt(d, "texto") } };
  const { error } = await supabase.from("settings").update({ textos }).eq("id", 1);
  if (error) return { erro: error.message };
  revalidatePath("/admin/ajustes");
  return { ok: "Texto salvo. Se mudou a versão, os alunos aceitam de novo no próximo acesso." };
}

export async function salvarPlano(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const id = txt(d, "id");
  const dados = {
    nome: txt(d, "nome"),
    tipo: txt(d, "tipo"),
    preco_centavos: paraCentavos(txt(d, "preco")),
    aulas_semana: num(d, "aulas_semana"),
    aulas_mes: num(d, "aulas_mes"),
    meses: Number(txt(d, "meses") || 1),
    descricao: nulo(d, "descricao"),
    ativo: d.get("ativo") === "on",
    ordem: Number(txt(d, "ordem") || 0),
  };
  const { error } = id ? await supabase.from("plans").update(dados).eq("id", id) : await supabase.from("plans").insert(dados);
  if (error) return { erro: error.message };
  revalidatePath("/admin/ajustes");
  return { ok: "Plano salvo." };
}

export async function salvarAcademia(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const id = txt(d, "id");
  const dados = { nome: txt(d, "nome"), intervalo_min: Number(txt(d, "intervalo_min") || 0), ativo: d.get("ativo") === "on", ordem: Number(txt(d, "ordem") || 0) };
  const { error } = id ? await supabase.from("gyms").update(dados).eq("id", id) : await supabase.from("gyms").insert(dados);
  if (error) return { erro: error.message };
  revalidatePath("/admin/ajustes");
  return { ok: "Academia salva." };
}

export async function salvarHorarios(_: Resultado, d: FormData): Promise<Resultado> {
  const supabase = await db();
  const linhas: { dia_semana: number; hora_inicio: string; hora_fim: string }[] = [];
  for (let dia = 0; dia <= 6; dia++) {
    if (d.get(`aberto_${dia}`) !== "on") continue;
    const ini = txt(d, `ini_${dia}`), fim = txt(d, `fim_${dia}`);
    if (!ini || !fim || fim <= ini) return { erro: "Confira os horários: o fim precisa ser depois do início." };
    linhas.push({ dia_semana: dia, hora_inicio: ini, hora_fim: fim });
  }
  const { error: e1 } = await supabase.from("availability").delete().gte("dia_semana", 0);
  if (e1) return { erro: e1.message };
  if (linhas.length) {
    const { error } = await supabase.from("availability").insert(linhas);
    if (error) return { erro: error.message };
  }
  revalidatePath("/admin/ajustes");
  return { ok: "Horários de atendimento salvos." };
}
