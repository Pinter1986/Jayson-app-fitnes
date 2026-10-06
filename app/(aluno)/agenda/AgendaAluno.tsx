"use client";

import { useMemo, useState, useTransition } from "react";
import { Mensagem, type Resultado } from "@/components/Formulario";
import { Cartao, Selo, Subtitulo, Vazio } from "@/components/ui";
import { dataBR, diaLocal, diaSemanaBR, horaBR } from "@/lib/formato";
import type { Academia, Reserva } from "@/lib/tipos";
import { cancelar, reservar } from "../acoes";

type Livre = { inicio: string; vagas: number; academia_id: string | null };

export default function AgendaAluno({
  livres,
  academias,
  minhas,
  cancelamentoHoras,
  precoDupla,
}: {
  livres: Livre[];
  academias: Academia[];
  minhas: Reserva[];
  cancelamentoHoras: number;
  precoDupla: string | null;
}) {
  const [academia, setAcademia] = useState(academias[0]?.id ?? "");
  const [escolhido, setEscolhido] = useState<Livre | null>(null);
  const [dupla, setDupla] = useState(false);
  const [estado, setEstado] = useState<Resultado>(null);
  const [pendente, iniciar] = useTransition();

  const porDia = useMemo(() => {
    const mapa = new Map<string, Livre[]>();
    for (const l of livres) {
      const dia = diaLocal(l.inicio);
      mapa.set(dia, [...(mapa.get(dia) ?? []), l]);
    }
    return [...mapa.entries()];
  }, [livres]);

  const nomeAcademia = (id: string | null) => academias.find((a) => a.id === id)?.nome;

  function confirmar() {
    if (!escolhido) return;
    const academiaFinal = escolhido.academia_id ?? academia;
    iniciar(async () => {
      const r = await reservar(escolhido.inicio, academiaFinal, dupla);
      setEstado(r);
      if (r?.ok) {
        setEscolhido(null);
        setDupla(false);
      }
    });
  }

  function desmarcar(r: Reserva) {
    const horasAte = (Date.parse(r.inicio) - Date.now()) / 3_600_000;
    const aviso =
      horasAte < cancelamentoHoras
        ? `Faltam menos de ${cancelamentoHoras}h: a aula vai contar como dada. Cancelar mesmo assim?`
        : "Cancelar esta aula? Ela volta para o seu saldo.";
    if (!confirm(aviso)) return;
    iniciar(async () => setEstado(await cancelar(r.id)));
  }

  return (
    <div className={pendente ? "pointer-events-none opacity-70" : ""}>
      <Mensagem estado={estado} />

      <Subtitulo>Minhas aulas</Subtitulo>
      {minhas.length ? (
        <Cartao className="divide-y divide-borda p-0">
          {minhas.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {diaSemanaBR(r.inicio, "long")}, {dataBR(r.inicio, { day: "2-digit", month: "2-digit" })} · {horaBR(r.inicio)}
                </p>
                <p className="text-sm text-muted">
                  {r.gyms?.nome}
                  {r.dupla ? " · dupla" : ""}
                  {r.cobranca_id ? " · avulsa" : ""}
                </p>
              </div>
              {Date.parse(r.inicio) > Date.now() && (
                <button onClick={() => desmarcar(r)} className="btn btn-perigo px-3 py-1.5 text-sm">
                  Cancelar
                </button>
              )}
            </div>
          ))}
        </Cartao>
      ) : (
        <Vazio>Nenhuma aula marcada.</Vazio>
      )}

      <Subtitulo>Horários livres</Subtitulo>
      <label className="mb-3 block">
        <span className="mb-1 block text-sm text-muted">Academia</span>
        <select className="campo" value={academia} onChange={(e) => setAcademia(e.target.value)}>
          {academias.map((a) => (
            <option key={a.id} value={a.id}>{a.nome}</option>
          ))}
        </select>
      </label>

      {porDia.length === 0 && <Vazio>Sem horários livres nos próximos dias.</Vazio>}
      {porDia.map(([dia, lista]) => (
        <div key={dia} className="mb-4">
          <p className="mb-2 font-semibold">
            {diaSemanaBR(dia + "T12:00:00-03:00", "long")}, {dataBR(dia, { day: "2-digit", month: "2-digit" })}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {lista.map((l) => {
              const outraAcademia = l.academia_id && l.academia_id !== academia;
              const ativo = escolhido?.inicio === l.inicio;
              return (
                <button
                  key={l.inicio}
                  onClick={() => setEscolhido(ativo ? null : l)}
                  className={`rounded-xl border px-1 py-2 text-center text-sm font-semibold ${
                    ativo ? "border-accent bg-accent text-accent-text" : "border-borda bg-surface"
                  } ${outraAcademia && !ativo ? "opacity-60" : ""}`}
                >
                  {horaBR(l.inicio)}
                  {l.academia_id && <span className="block text-[10px] font-normal">{nomeAcademia(l.academia_id)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {escolhido && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4">
          <Cartao className="mx-auto max-w-md shadow-2xl">
            <p className="font-semibold">
              {diaSemanaBR(escolhido.inicio, "long")}, {horaBR(escolhido.inicio)} · {nomeAcademia(escolhido.academia_id ?? academia)}
            </p>
            {escolhido.academia_id && escolhido.academia_id !== academia && (
              <p className="mt-1 text-xs text-muted">Neste horário a aula já é na {nomeAcademia(escolhido.academia_id)}.</p>
            )}
            {precoDupla && (
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dupla} onChange={(e) => setDupla(e.target.checked)} />
                Aula em dupla <Selo tom="marca">{precoDupla} por pessoa</Selo>
              </label>
            )}
            <div className="mt-3 flex gap-2">
              <button className="btn btn-secundario flex-1" onClick={() => setEscolhido(null)}>Voltar</button>
              <button className="btn btn-primario flex-1" onClick={confirmar} disabled={pendente}>
                {pendente ? "Marcando…" : "Confirmar"}
              </button>
            </div>
          </Cartao>
        </div>
      )}
    </div>
  );
}
