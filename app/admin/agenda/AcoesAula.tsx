"use client";

import { useState, useTransition } from "react";
import type { StatusReserva } from "@/lib/tipos";
import { mudarStatusAula } from "../acoes";

const ROTULO: Record<StatusReserva, string> = { marcada: "Marcada", dada: "Presente", falta: "Falta", cancelada: "Cancelada", cancelada_tarde: "Cancelada tarde" };

export default function AcoesAula({ id, status }: { id: string; status: StatusReserva }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string>();

  const fazer = (s: Parameters<typeof mudarStatusAula>[1], pergunta?: string) => {
    if (pergunta && !confirm(pergunta)) return;
    iniciar(async () => setErro((await mudarStatusAula(id, s))?.erro));
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-sm ${pendente ? "opacity-50" : ""}`}>
      {status !== "marcada" && <span className="text-muted">{ROTULO[status]}</span>}
      {status !== "dada" && <button className="btn btn-secundario px-2.5 py-1" onClick={() => fazer("dada")}>Presente</button>}
      {status !== "falta" && <button className="btn btn-secundario px-2.5 py-1" onClick={() => fazer("falta")}>Falta</button>}
      {status === "marcada" && (
        <>
          <button className="btn btn-secundario px-2.5 py-1" onClick={() => fazer("cancelar_devolver", "Cancelar e devolver a aula ao saldo do aluno?")}>Cancelar</button>
          <button className="btn btn-perigo px-2.5 py-1" onClick={() => fazer("cancelar", "Cancelar seguindo a regra das 24h?")}>Cancelar (regra)</button>
        </>
      )}
      {erro && <span className="w-full text-err">{erro}</span>}
    </div>
  );
}
