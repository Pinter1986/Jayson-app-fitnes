"use client";

import { useState } from "react";
import { comTaxa, taxaPct } from "@/lib/dinheiro";
import { brl, linkWhatsApp } from "@/lib/formato";
import type { Ajustes } from "@/lib/tipos";

// Fase 1: mostra o valor final por forma de pagamento (taxa repassada).
// O pagamento online (PIX automático e cartão em até 12x) entra na fase 2.
export default function Pagar({
  valorCentavos,
  taxas,
  exemplo,
  chavePix,
  whatsapp,
  descricao,
}: {
  valorCentavos: number;
  taxas: Ajustes["taxas_cartao"];
  exemplo: boolean;
  chavePix: string | null;
  whatsapp: string | null;
  descricao: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [forma, setForma] = useState<"pix" | "debito" | "credito">("pix");
  const [parcelas, setParcelas] = useState(1);
  const pct = taxaPct({ taxas_cartao: taxas }, forma, parcelas);
  const total = comTaxa(valorCentavos, pct);

  if (!aberto) {
    return (
      <button className="btn btn-primario mt-3 w-full" onClick={() => setAberto(true)}>
        Pagar
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-surface-2 p-3">
      <div className="grid grid-cols-3 gap-2 text-sm">
        {(["pix", "debito", "credito"] as const).map((f) => (
          <button key={f} onClick={() => setForma(f)} className={`btn py-2 ${forma === f ? "btn-primario" : "btn-secundario"}`}>
            {f === "pix" ? "PIX" : f === "debito" ? "Débito" : "Crédito"}
          </button>
        ))}
      </div>
      {forma === "credito" && (
        <select className="campo" value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
            const t = comTaxa(valorCentavos, taxaPct({ taxas_cartao: taxas }, "credito", n));
            return (
              <option key={n} value={n}>
                {n}x de {brl(Math.ceil(t / n))} · total {brl(t)}
              </option>
            );
          })}
        </select>
      )}
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">Total{pct > 0 ? ` (taxa do cartão ${pct.toLocaleString("pt-BR")}%)` : ""}</span>
        <span className="font-titulo text-xl font-extrabold">{brl(total)}</span>
      </div>
      {exemplo && pct > 0 && <p className="text-xs text-warn">Taxas de exemplo; os valores finais serão confirmados.</p>}

      {forma === "pix" && chavePix ? (
        <p className="text-sm">Chave PIX: <b className="break-all">{chavePix}</b></p>
      ) : (
        <p className="text-sm text-muted">
          {forma === "pix" ? "O PIX direto pelo app chega em breve." : "O cartão pelo app chega em breve. Por enquanto, pague no próximo treino pela maquininha do Jayson."}
        </p>
      )}
      <a
        className="btn btn-secundario w-full"
        target="_blank"
        rel="noreferrer"
        href={linkWhatsApp(whatsapp, `Oi Jayson! Vou pagar "${descricao}" (${brl(total)}) ${forma === "pix" ? "por PIX" : `no ${forma === "debito" ? "débito" : `crédito em ${parcelas}x`}`}.`)}
      >
        Avisar o Jayson
      </a>
    </div>
  );
}
