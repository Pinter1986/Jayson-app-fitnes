import Link from "next/link";
import { Cartao, LinkLinha, Numero, Selo, Subtitulo, Titulo } from "@/components/ui";
import { estaAtrasada, multaDevida } from "@/lib/dinheiro";
import { brl, dataBR, diaLocal, diaSemanaBR, horaBR, inicioDoMes, instanteLocal, somaDias } from "@/lib/formato";
import { ajustesAtuais, exigirAdmin } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { Cobranca, Perfil, Reserva, Treino } from "@/lib/tipos";
import { sair } from "../(auth)/acoes";

export const metadata = { title: "Painel" };

export default async function Painel() {
  const eu = await exigirAdmin();
  const ajustes = await ajustesAtuais();
  const supabase = await createClient();
  const hoje = diaLocal();
  const mes = inicioDoMes(hoje);
  const fimMes = somaDias(inicioDoMes(somaDias(mes, 32)), -1);

  const [aulas, cobrancasMes, abertas, treinos, avaliacoes, alunos, pendentes, checkins] = await Promise.all([
    supabase.from("bookings").select("*, gyms(nome), profiles!bookings_aluno_id_fkey(nome, whatsapp)").eq("status", "marcada")
      .gte("inicio", instanteLocal(hoje, "00:00")).lt("inicio", instanteLocal(somaDias(hoje, 2), "00:00")).order("inicio"),
    supabase.from("invoices").select("*").neq("status", "cancelada").gte("vencimento", mes).lte("vencimento", fimMes),
    supabase.from("invoices").select("*, profiles(nome, whatsapp)").eq("status", "aberta").lte("vencimento", somaDias(hoje, 7)).order("vencimento"),
    supabase.from("workouts").select("aluno_id, publicado_em, profiles(nome)").eq("ativo", true).not("aluno_id", "is", null),
    supabase.from("assessments").select("aluno_id, data"),
    supabase.from("profiles").select("*").eq("papel", "aluno").eq("ativo", true),
    supabase.from("subscriptions").select("id, aluno_id, profiles(nome), plans(nome)").eq("status", "pendente"),
    supabase.from("checkins").select("id", { count: "exact", head: true }).is("respondido_em", null),
  ]);

  const listaAulas = (aulas.data ?? []) as Reserva[];
  const doMes = (cobrancasMes.data ?? []) as Cobranca[];
  const recebido = doMes.filter((c) => c.status === "paga").reduce((s, c) => s + c.valor_centavos + c.multa_centavos, 0);
  const aReceber = doMes.filter((c) => c.status === "aberta").reduce((s, c) => s + c.valor_centavos, 0);
  const listaAbertas = (abertas.data ?? []) as Cobranca[];
  const atrasadas = listaAbertas.filter((c) => estaAtrasada(c, hoje));
  const vencendo = listaAbertas.filter((c) => !estaAtrasada(c, hoje));
  const listaAlunos = (alunos.data ?? []) as Perfil[];

  // treino mais recente por aluno; troca a cada 30 dias
  const ultimoTreino = new Map<string, { data: string; nome: string }>();
  for (const t of (treinos.data ?? []) as unknown as (Pick<Treino, "aluno_id" | "publicado_em"> & { profiles: { nome: string } })[]) {
    const atual = ultimoTreino.get(t.aluno_id!);
    if (!atual || t.publicado_em > atual.data) ultimoTreino.set(t.aluno_id!, { data: t.publicado_em, nome: t.profiles?.nome });
  }
  const limiteTreino = somaDias(hoje, -30);
  const trocar = [...ultimoTreino.entries()].filter(([, v]) => diaLocal(v.data) < limiteTreino);

  const ultimaAvaliacao = new Map<string, string>();
  for (const a of avaliacoes.data ?? []) if ((ultimaAvaliacao.get(a.aluno_id) ?? "") < a.data) ultimaAvaliacao.set(a.aluno_id, a.data);
  const limiteAval = somaDias(hoje, -90);
  const reavaliar = [...ultimaAvaliacao.entries()].filter(([, d]) => d < limiteAval).map(([id, d]) => ({ id, d, nome: listaAlunos.find((p) => p.id === id)?.nome }));

  const aniversariantes = listaAlunos.filter((p) => p.nascimento && p.nascimento.slice(5, 7) === hoje.slice(5, 7)).sort((a, b) => a.nascimento!.slice(8).localeCompare(b.nascimento!.slice(8)));

  return (
    <>
      <Titulo
        sub={dataBR(new Date(), { weekday: "long", day: "numeric", month: "long" })}
        acao={<Link href="/admin/ajustes" className="btn btn-secundario px-3 py-2 text-sm">Ajustes</Link>}
      >
        Olá, {eu.nome.split(" ")[0]}
      </Titulo>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Recebido no mês" valor={brl(recebido)} tom="ok" />
        <Numero rotulo="A receber no mês" valor={brl(aReceber)} />
        <Numero rotulo="Alunos ativos" valor={listaAlunos.length} />
        <Numero rotulo="Em atraso" valor={atrasadas.length} tom={atrasadas.length ? "erro" : undefined} />
      </div>

      {(pendentes.data ?? []).length > 0 && (
        <>
          <Subtitulo>Planos para confirmar</Subtitulo>
          <Cartao className="py-1">
            {(pendentes.data as unknown as { id: string; aluno_id: string; profiles: { nome: string }; plans: { nome: string } }[]).map((s) => (
              <LinkLinha key={s.id} href={`/admin/alunos/${s.aluno_id}`} direita={<Selo tom="aviso">pendente</Selo>}>
                <p className="font-semibold">{s.profiles?.nome}</p>
                <p className="text-sm text-muted">{s.plans?.nome}</p>
              </LinkLinha>
            ))}
          </Cartao>
        </>
      )}

      <Subtitulo acao={<Link href="/admin/agenda" className="text-sm text-accent">Agenda ›</Link>}>Aulas de hoje e amanhã</Subtitulo>
      <Cartao className="py-1">
        {listaAulas.length === 0 && <p className="py-3 text-sm text-muted">Nenhuma aula marcada.</p>}
        {listaAulas.map((a) => (
          <div key={a.id} className="flex items-center justify-between border-b border-borda py-3 last:border-0">
            <div>
              <p className="font-semibold">{a.profiles?.nome}</p>
              <p className="text-sm text-muted">{a.gyms?.nome}{a.dupla ? " · dupla" : ""}</p>
            </div>
            <p className="text-right text-sm">{diaLocal(a.inicio) === hoje ? "Hoje" : "Amanhã"}<br /><b>{horaBR(a.inicio)}</b></p>
          </div>
        ))}
      </Cartao>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <div>
          <Subtitulo>Em atraso</Subtitulo>
          <Cartao className="py-1">
            {atrasadas.length === 0 && <p className="py-3 text-sm text-muted">Ninguém em atraso. 👏</p>}
            {atrasadas.map((c) => (
              <LinkLinha key={c.id} href={`/admin/financeiro?mes=${c.vencimento.slice(0, 7)}`} direita={<span className="text-sm text-err">{brl(c.valor_centavos + multaDevida(c, ajustes, hoje))}</span>}>
                <p className="font-semibold">{c.profiles?.nome}</p>
                <p className="text-xs text-muted">{c.descricao} · venceu {dataBR(c.vencimento, { day: "2-digit", month: "2-digit" })}</p>
              </LinkLinha>
            ))}
          </Cartao>
        </div>
        <div>
          <Subtitulo>Vencendo em 7 dias</Subtitulo>
          <Cartao className="py-1">
            {vencendo.length === 0 && <p className="py-3 text-sm text-muted">Nada vencendo.</p>}
            {vencendo.map((c) => (
              <LinkLinha key={c.id} href={`/admin/financeiro?mes=${c.vencimento.slice(0, 7)}`} direita={<span className="text-sm">{brl(c.valor_centavos)}</span>}>
                <p className="font-semibold">{c.profiles?.nome}</p>
                <p className="text-xs text-muted">vence {diaSemanaBR(c.vencimento + "T12:00:00-03:00")} {dataBR(c.vencimento, { day: "2-digit", month: "2-digit" })}</p>
              </LinkLinha>
            ))}
          </Cartao>
        </div>
        <div>
          <Subtitulo>Treinos para trocar (+30 dias)</Subtitulo>
          <Cartao className="py-1">
            {trocar.length === 0 && <p className="py-3 text-sm text-muted">Todos em dia.</p>}
            {trocar.map(([id, v]) => (
              <LinkLinha key={id} href={`/admin/treinos?aluno=${id}`} direita={<span className="text-xs">{dataBR(v.data, { day: "2-digit", month: "2-digit" })}</span>}>
                <p className="font-semibold">{v.nome}</p>
              </LinkLinha>
            ))}
          </Cartao>
        </div>
        <div>
          <Subtitulo>Reavaliações vencidas (+3 meses)</Subtitulo>
          <Cartao className="py-1">
            {reavaliar.length === 0 && <p className="py-3 text-sm text-muted">Nenhuma.</p>}
            {reavaliar.map((r) => (
              <LinkLinha key={r.id} href={`/admin/alunos/${r.id}`} direita={<span className="text-xs">{dataBR(r.d, { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>}>
                <p className="font-semibold">{r.nome}</p>
              </LinkLinha>
            ))}
          </Cartao>
        </div>
        <div>
          <Subtitulo>Aniversariantes do mês</Subtitulo>
          <Cartao className="py-1">
            {aniversariantes.length === 0 && <p className="py-3 text-sm text-muted">Nenhum este mês.</p>}
            {aniversariantes.map((p) => (
              <LinkLinha key={p.id} href={`/admin/alunos/${p.id}`} direita={p.nascimento!.slice(5) === hoje.slice(5) ? <Selo tom="marca">hoje 🎉</Selo> : <span className="text-xs">dia {p.nascimento!.slice(8)}</span>}>
                <p className="font-semibold">{p.nome}</p>
              </LinkLinha>
            ))}
          </Cartao>
        </div>
        <div>
          <Subtitulo>Check-ins sem resposta</Subtitulo>
          <Cartao>
            <p className="font-titulo text-2xl font-extrabold">{checkins.count ?? 0}</p>
            <p className="text-xs text-muted">Check-in entra na fase 2.</p>
          </Cartao>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href="/admin/exercicios" className="btn btn-secundario flex-1">Exercícios</Link>
        <form action={sair} className="flex-1"><button className="btn btn-secundario w-full">Sair</button></form>
      </div>
    </>
  );
}
