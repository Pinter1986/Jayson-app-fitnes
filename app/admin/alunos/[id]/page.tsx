import Link from "next/link";
import { notFound } from "next/navigation";
import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, LinkLinha, Rotulo, Selo, Subtitulo, Titulo, Voltar } from "@/components/ui";
import { PARQ, PERGUNTAS } from "@/lib/anamnese";
import { situacao } from "@/lib/dinheiro";
import { brl, dataBR, diaLocal, horaBR, idade, linkWhatsApp } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { Assinatura, Cobranca, Perfil, Plano, Reserva, Treino } from "@/lib/tipos";
import { salvarAluno, salvarAssinatura } from "../../acoes";

const STATUS_AULA = { marcada: "marcada", dada: "presente", falta: "falta", cancelada: "cancelada", cancelada_tarde: "cancelada tarde" };
const ACEITE = { contrato: "Contrato", termos_privacidade: "Termos e privacidade", responsabilidade: "Responsabilidade (PAR-Q)", fotos_acompanhamento: "Fotos de acompanhamento", divulgacao: "Divulgação" };

export default async function FichaAluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  const { id } = await params;
  const { novo } = await searchParams;
  const supabase = await createClient();
  const hoje = diaLocal();

  const [{ data: perfil }, { data: nota }, { data: assinaturas }, { data: planos }, { data: aulas }, { data: cobrancas }, { data: anamnese }, { data: aceites }, { data: treinos }, { data: saldo }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("admin_notes").select("texto").eq("aluno_id", id).maybeSingle(),
      supabase.from("subscriptions").select("*, plans(*)").eq("aluno_id", id).order("criado_em", { ascending: false }),
      supabase.from("plans").select("*").order("ordem"),
      supabase.from("bookings").select("*, gyms(nome)").eq("aluno_id", id).order("inicio", { ascending: false }).limit(15),
      supabase.from("invoices").select("*").eq("aluno_id", id).order("vencimento", { ascending: false }).limit(15),
      supabase.from("anamnesis").select("*").eq("aluno_id", id).maybeSingle(),
      supabase.from("consents").select("*").eq("aluno_id", id).order("criado_em", { ascending: false }),
      supabase.from("workouts").select("*").eq("aluno_id", id).order("ordem"),
      supabase.rpc("saldo_aulas", { p_aluno: id }),
    ]);
  if (!perfil) notFound();
  const p = perfil as Perfil;
  const lista = (assinaturas ?? []) as Assinatura[];
  const viva = lista.find((s) => s.status !== "encerrada");
  const listaPlanos = ((planos ?? []) as Plano[]).filter((x) => x.tipo === "presencial" || x.tipo === "online");
  const resp = (anamnese?.respostas ?? {}) as Record<string, string>;
  const parq = (anamnese?.parq ?? {}) as Record<string, boolean>;
  const parqSim = PARQ.filter((_, i) => parq[`q${i + 1}`]);

  return (
    <>
      <Voltar href="/admin/alunos">Alunos</Voltar>
      <Titulo
        sub={[p.email, idade(p.nascimento) != null ? `${idade(p.nascimento)} anos` : null, p.origem].filter(Boolean).join(" · ")}
        acao={p.whatsapp ? <a className="btn btn-secundario px-3 py-2 text-sm" target="_blank" rel="noreferrer" href={linkWhatsApp(p.whatsapp, `Oi ${p.nome.split(" ")[0]}!`)}>WhatsApp</a> : null}
      >
        {p.nome}
      </Titulo>

      {novo && (
        <Cartao className="mb-3 border-ok/40">
          <p className="text-sm">
            Aluno cadastrado. Envie para ele:{" "}
            <a
              className="font-semibold text-accent underline"
              target="_blank"
              rel="noreferrer"
              href={linkWhatsApp(p.whatsapp, `Oi ${p.nome.split(" ")[0]}! Agora a agenda, os treinos e o financeiro ficam no meu app. Para entrar: abra ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/esqueci-senha, coloque o e-mail ${p.email} e crie sua senha pelo link que chegar.`)}
            >
              mensagem de primeiro acesso
            </a>
          </p>
        </Cartao>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Cartao><p className="text-xs text-muted">Saldo do mês</p><p className="font-titulo text-xl font-extrabold">{saldo ?? "—"}</p></Cartao>
        <Cartao><p className="text-xs text-muted">Plano</p><p className="truncate text-sm font-semibold">{viva?.plans?.nome ?? "Sem plano"}</p></Cartao>
        <Cartao><p className="text-xs text-muted">Status</p><p className="text-sm font-semibold">{p.ativo ? "Ativo" : "Inativo"}</p></Cartao>
      </div>

      <Subtitulo>Plano</Subtitulo>
      <Cartao>
        <Formulario acao={salvarAssinatura}>
          <input type="hidden" name="aluno_id" value={p.id} />
          <input type="hidden" name="id" value={viva?.id ?? ""} />
          {viva?.status === "pendente" && <p className="text-sm text-warn">Plano escolhido no cadastro. Confira valor e vencimento e mude o status para Ativo.</p>}
          {viva?.status === "cancelamento_pedido" && <p className="text-sm text-warn">Cancelamento pedido em {dataBR(viva.cancelamento_pedido_em!)}. Ativo até {viva.fim ? dataBR(viva.fim) : "—"}.</p>}
          <Rotulo texto="Plano">
            <select className="campo" name="plano_id" defaultValue={viva?.plano_id ?? ""} required>
              <option value="" disabled>Escolha</option>
              {listaPlanos.map((x) => <option key={x.id} value={x.id}>{x.nome} · {brl(x.preco_centavos)}</option>)}
            </select>
          </Rotulo>
          <div className="grid grid-cols-2 gap-3">
            <Rotulo texto="Valor (R$)"><input className="campo" name="valor" inputMode="decimal" defaultValue={viva ? (viva.valor_centavos / 100).toFixed(2).replace(".", ",") : ""} required /></Rotulo>
            <Rotulo texto="Vence dia">
              <select className="campo" name="dia_vencimento" defaultValue={String(viva?.dia_vencimento ?? 10)}><option value="5">5</option><option value="10">10</option></select>
            </Rotulo>
            <Rotulo texto="Início"><input className="campo" type="date" name="inicio" defaultValue={viva?.inicio ?? hoje} required /></Rotulo>
            <Rotulo texto="Fim (opcional)"><input className="campo" type="date" name="fim" defaultValue={viva?.fim ?? ""} /></Rotulo>
          </div>
          <Rotulo texto="Status">
            <select className="campo" name="status" defaultValue={viva?.status ?? "ativa"}>
              <option value="pendente">Pendente</option>
              <option value="ativa">Ativo</option>
              <option value="cancelamento_pedido">Cancelamento pedido (aviso de 30 dias)</option>
              <option value="encerrada">Encerrado</option>
            </select>
          </Rotulo>
          <Enviar className="w-full">{viva ? "Salvar plano" : "Criar plano"}</Enviar>
        </Formulario>
      </Cartao>

      <Subtitulo>Dados e observações privadas</Subtitulo>
      <Cartao>
        <Formulario acao={salvarAluno}>
          <input type="hidden" name="id" value={p.id} />
          <Rotulo texto="Nome"><input className="campo" name="nome" defaultValue={p.nome} required /></Rotulo>
          <div className="grid grid-cols-2 gap-3">
            <Rotulo texto="WhatsApp"><input className="campo" name="whatsapp" defaultValue={p.whatsapp ?? ""} /></Rotulo>
            <Rotulo texto="Nascimento"><input className="campo" type="date" name="nascimento" defaultValue={p.nascimento ?? ""} /></Rotulo>
          </div>
          <Rotulo texto="Sexo">
            <select className="campo" name="sexo" defaultValue={p.sexo ?? ""}><option value="">—</option><option value="F">Feminino</option><option value="M">Masculino</option></select>
          </Rotulo>
          <Rotulo texto="Observações privadas" dica="Só você vê."><textarea className="campo" name="notas" rows={3} defaultValue={nota?.texto ?? ""} /></Rotulo>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={p.ativo} /> Aluno ativo</label>
          <Enviar className="w-full">Salvar ficha</Enviar>
        </Formulario>
      </Cartao>

      <Subtitulo acao={<Link href={`/admin/treinos?aluno=${p.id}`} className="text-sm text-accent">Novo treino ›</Link>}>Treinos</Subtitulo>
      <Cartao className="py-1">
        {((treinos ?? []) as Treino[]).length === 0 && <p className="py-3 text-sm text-muted">Sem treino.</p>}
        {((treinos ?? []) as Treino[]).map((t) => (
          <LinkLinha key={t.id} href={`/admin/treinos/${t.id}`} direita={!t.ativo ? <Selo>inativo</Selo> : <span className="text-xs">{dataBR(t.publicado_em, { day: "2-digit", month: "2-digit" })}</span>}>
            <p className="font-semibold">Treino {t.nome}</p>
          </LinkLinha>
        ))}
      </Cartao>

      <Subtitulo>Anamnese</Subtitulo>
      <Cartao className="space-y-2 text-sm">
        {!anamnese && <p className="text-muted">Ainda não respondida (o aluno responde no primeiro acesso).</p>}
        {anamnese && (
          <>
            {parqSim.length ? (
              <div className="rounded-xl bg-warn/10 p-3 text-warn">
                <p className="font-semibold">PAR-Q com {parqSim.length} resposta(s) &quot;sim&quot;:</p>
                <ul className="list-disc pl-5">{parqSim.map((q) => <li key={q}>{q}</li>)}</ul>
              </div>
            ) : (
              <Selo tom="ok">PAR-Q sem restrições</Selo>
            )}
            {PERGUNTAS.map((q) => (
              <div key={q.id}><p className="text-muted">{q.rotulo}</p><p>{resp[q.id] || "—"}</p></div>
            ))}
          </>
        )}
      </Cartao>

      <Subtitulo>Aulas recentes</Subtitulo>
      <Cartao className="py-1 text-sm">
        {((aulas ?? []) as Reserva[]).length === 0 && <p className="py-3 text-muted">Nenhuma aula.</p>}
        {((aulas ?? []) as Reserva[]).map((a) => (
          <div key={a.id} className="flex justify-between border-b border-borda py-2 last:border-0">
            <span>{dataBR(a.inicio, { day: "2-digit", month: "2-digit" })} {horaBR(a.inicio)} · {a.gyms?.nome}</span>
            <span className="text-muted">{STATUS_AULA[a.status]}</span>
          </div>
        ))}
      </Cartao>

      <Subtitulo acao={<Link href="/admin/financeiro" className="text-sm text-accent">Financeiro ›</Link>}>Cobranças</Subtitulo>
      <Cartao className="py-1 text-sm">
        {((cobrancas ?? []) as Cobranca[]).length === 0 && <p className="py-3 text-muted">Nenhuma cobrança.</p>}
        {((cobrancas ?? []) as Cobranca[]).map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 border-b border-borda py-2 last:border-0">
            <span>{c.descricao}</span>
            <span className="flex items-center gap-2">{brl(c.valor_centavos)} <Selo tom={situacao(c, hoje).tom}>{situacao(c, hoje).texto}</Selo></span>
          </div>
        ))}
      </Cartao>

      <Subtitulo>Aceites registrados</Subtitulo>
      <Cartao className="py-1 text-sm">
        {(aceites ?? []).length === 0 && <p className="py-3 text-muted">Nenhum aceite ainda.</p>}
        {(aceites ?? []).map((a) => (
          <div key={a.id} className="flex justify-between gap-2 border-b border-borda py-2 last:border-0">
            <span>{ACEITE[a.tipo as keyof typeof ACEITE]} <span className="text-muted">({a.valor}, v. {a.versao})</span></span>
            <span className="shrink-0 text-muted">{dataBR(a.criado_em, { day: "2-digit", month: "2-digit", year: "2-digit" })} {horaBR(a.criado_em)}</span>
          </div>
        ))}
      </Cartao>
    </>
  );
}
