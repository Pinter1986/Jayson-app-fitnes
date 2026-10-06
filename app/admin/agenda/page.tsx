import Link from "next/link";
import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, Rotulo, Subtitulo, Titulo } from "@/components/ui";
import { dataBR, diaLocal, diaSemanaBR, horaBR, instanteLocal, somaDias } from "@/lib/formato";
import { ajustesAtuais } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { Academia, Perfil, Reserva } from "@/lib/tipos";
import { bloquear, desbloquear, marcarParaAluno } from "../acoes";
import AcoesAula from "./AcoesAula";

export const metadata = { title: "Agenda" };

const CORES = ["bg-accent/80", "bg-sky-600/80", "bg-emerald-600/80", "bg-violet-600/80", "bg-amber-600/80"];

export default async function AgendaAdmin({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const sp = await searchParams;
  const hoje = diaLocal();
  const dia = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : hoje;
  // semana de segunda a domingo
  const dow = new Date(dia + "T12:00:00Z").getUTCDay();
  const segunda = somaDias(dia, -((dow + 6) % 7));
  const dias = Array.from({ length: 7 }, (_, i) => somaDias(segunda, i));

  const ajustes = await ajustesAtuais();
  const supabase = await createClient();
  const [{ data: reservas }, { data: academias }, { data: alunos }, { data: horarios }, { data: bloqueios }] = await Promise.all([
    supabase.from("bookings").select("*, gyms(nome), profiles!bookings_aluno_id_fkey(nome, whatsapp)").in("status", ["marcada", "dada", "falta"])
      .gte("inicio", instanteLocal(segunda, "00:00")).lt("inicio", instanteLocal(somaDias(segunda, 7), "00:00")).order("inicio"),
    supabase.from("gyms").select("*").eq("ativo", true).order("ordem"),
    supabase.from("profiles").select("id, nome").eq("papel", "aluno").eq("ativo", true).order("nome"),
    supabase.from("availability").select("*"),
    supabase.from("availability_blocks").select("*").gte("fim", instanteLocal(segunda, "00:00")).order("inicio"),
  ]);

  const lista = (reservas ?? []) as Reserva[];
  const gyms = (academias ?? []) as Academia[];
  const corDe = (id: string) => CORES[gyms.findIndex((g) => g.id === id) % CORES.length];
  const faixa = (horarios ?? []) as { hora_inicio: string; hora_fim: string }[];
  const hIni = faixa.length ? Math.min(...faixa.map((h) => Number(h.hora_inicio.slice(0, 2)))) : 5;
  const hFim = faixa.length ? Math.max(...faixa.map((h) => Number(h.hora_fim.slice(0, 2)))) : 22;
  const horas = Array.from({ length: Math.max(hFim - hIni, 0) }, (_, i) => hIni + i);
  const doDia = lista.filter((r) => diaLocal(r.inicio) === dia);
  const blocos = (bloqueios ?? []) as { id: string; inicio: string; fim: string; motivo: string | null }[];

  return (
    <>
      <Titulo sub={`Semana de ${dataBR(segunda, { day: "2-digit", month: "2-digit" })} a ${dataBR(dias[6], { day: "2-digit", month: "2-digit" })}`}>Agenda</Titulo>

      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={`?dia=${somaDias(segunda, -7)}`} className="btn btn-secundario px-3 py-1.5 text-sm">‹ Semana</Link>
        <Link href={`?dia=${hoje}`} className="text-sm text-accent">Hoje</Link>
        <Link href={`?dia=${somaDias(segunda, 7)}`} className="btn btn-secundario px-3 py-1.5 text-sm">Semana ›</Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-borda">
        <table className="w-full min-w-[640px] table-fixed text-xs">
          <thead>
            <tr className="bg-surface">
              <th className="w-12 p-1" />
              {dias.map((d) => (
                <th key={d} className={`p-1 font-semibold ${d === dia ? "text-accent" : ""}`}>
                  <Link href={`?dia=${d}`} className="block">
                    {diaSemanaBR(d + "T12:00:00-03:00")} {d.slice(8)}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horas.map((h) => (
              <tr key={h} className="border-t border-borda">
                <td className="p-1 text-center text-muted">{String(h).padStart(2, "0")}h</td>
                {dias.map((d) => {
                  const ini = instanteLocal(d, `${String(h).padStart(2, "0")}:00`);
                  const aqui = lista.filter((r) => new Date(r.inicio).getTime() === new Date(ini).getTime());
                  const bloqueado = blocos.some((b) => b.inicio < new Date(Date.parse(ini) + 3600_000).toISOString() && b.fim > ini);
                  return (
                    <td key={d} className={`h-9 border-l border-borda p-0.5 align-top ${bloqueado ? "bg-surface-2 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,var(--border)_4px,var(--border)_5px)]" : ""}`}>
                      {aqui.map((r) => (
                        <span key={r.id} className={`mb-0.5 block truncate rounded px-1 text-white ${corDe(r.academia_id)} ${r.status === "falta" ? "line-through opacity-60" : ""}`}>
                          {r.profiles?.nome.split(" ")[0]}
                        </span>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
        {gyms.map((g) => (
          <span key={g.id} className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${corDe(g.id)}`} />{g.nome}</span>
        ))}
      </div>

      <Subtitulo>
        {diaSemanaBR(dia + "T12:00:00-03:00", "long")}, {dataBR(dia, { day: "2-digit", month: "2-digit" })}
      </Subtitulo>
      <Cartao className="py-1">
        {doDia.length === 0 && <p className="py-3 text-sm text-muted">Nenhuma aula neste dia.</p>}
        {doDia.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-borda py-3 last:border-0">
            <div>
              <p className="font-semibold">{horaBR(r.inicio)} · {r.profiles?.nome}</p>
              <p className="text-sm text-muted">{r.gyms?.nome}{r.dupla ? " · dupla" : ""}{r.cobranca_id ? " · avulsa" : ""}</p>
            </div>
            <AcoesAula id={r.id} status={r.status} />
          </div>
        ))}
      </Cartao>

      <Subtitulo>Marcar aula para um aluno</Subtitulo>
      <Cartao>
        <Formulario acao={marcarParaAluno} limparAoSalvar>
          <Rotulo texto="Aluno">
            <select className="campo" name="aluno_id" required>
              {((alunos ?? []) as Pick<Perfil, "id" | "nome">[]).map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </Rotulo>
          <div className="grid grid-cols-2 gap-3">
            <Rotulo texto="Dia"><input className="campo" type="date" name="dia" defaultValue={dia} required /></Rotulo>
            <Rotulo texto="Hora"><input className="campo" type="time" name="hora" step={ajustes.duracao_aula_min * 60} defaultValue="07:00" required /></Rotulo>
          </div>
          <Rotulo texto="Academia">
            <select className="campo" name="academia_id">
              {gyms.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
          </Rotulo>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="dupla" /> Aula em dupla (gera cobrança)</label>
          <p className="text-xs text-muted">Você pode marcar fora do prazo e sem saldo; capacidade e deslocamento continuam valendo.</p>
          <Enviar className="w-full">Marcar</Enviar>
        </Formulario>
      </Cartao>

      <Subtitulo>Bloquear horários ou dias</Subtitulo>
      <Cartao>
        <Formulario acao={bloquear} limparAoSalvar>
          <div className="grid grid-cols-2 gap-3">
            <Rotulo texto="De (dia)"><input className="campo" type="date" name="dia" defaultValue={dia} required /></Rotulo>
            <Rotulo texto="Hora" dica="vazio = dia todo"><input className="campo" type="time" name="de" /></Rotulo>
            <Rotulo texto="Até (dia)"><input className="campo" type="date" name="ate_dia" /></Rotulo>
            <Rotulo texto="Hora"><input className="campo" type="time" name="ate" /></Rotulo>
          </div>
          <Rotulo texto="Motivo (opcional)"><input className="campo" name="motivo" placeholder="Férias, curso…" /></Rotulo>
          <Enviar variante="secundario" className="w-full">Bloquear</Enviar>
        </Formulario>
        {blocos.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {blocos.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2">
                <span>
                  {dataBR(b.inicio, { day: "2-digit", month: "2-digit" })} {horaBR(b.inicio)} → {dataBR(b.fim, { day: "2-digit", month: "2-digit" })} {horaBR(b.fim)}
                  {b.motivo && <span className="text-muted"> · {b.motivo}</span>}
                </span>
                <form action={desbloquear.bind(null, b.id)}><button className="text-err">Remover</button></form>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}
