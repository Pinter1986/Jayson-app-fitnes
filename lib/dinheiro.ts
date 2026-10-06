import { diaLocal } from "./formato";
import type { Ajustes, Cobranca } from "./tipos";

// Taxa do cartão repassada: o Jayson recebe o valor cheio.
// valor cobrado = valor ÷ (1 − taxa)
export function taxaPct(ajustes: Pick<Ajustes, "taxas_cartao">, forma: string, parcelas = 1) {
  const t = ajustes.taxas_cartao ?? {};
  if (forma === "debito") return Number(t.debito ?? 0);
  if (forma === "credito") return Number(t.credito?.[String(parcelas)] ?? 0);
  return 0;
}

export function comTaxa(valorCentavos: number, pct: number) {
  if (pct <= 0) return valorCentavos;
  return Math.round(valorCentavos / (1 - pct / 100));
}

export function estaAtrasada(c: Pick<Cobranca, "status" | "vencimento">, hoje = diaLocal()) {
  return c.status === "aberta" && c.vencimento < hoje;
}

// Multa única sobre o valor; juros de mora por mês (pró-rata por dia) se configurado
export function multaDevida(c: Pick<Cobranca, "status" | "vencimento" | "valor_centavos">, ajustes: Pick<Ajustes, "multa_pct" | "juros_mes_pct">, hoje = diaLocal()) {
  if (!estaAtrasada(c, hoje)) return 0;
  const dias = Math.round((Date.parse(hoje) - Date.parse(c.vencimento)) / 86_400_000);
  const multa = c.valor_centavos * (Number(ajustes.multa_pct) / 100);
  const juros = c.valor_centavos * (Number(ajustes.juros_mes_pct) / 100) * (dias / 30);
  return Math.round(multa + juros);
}

export function situacao(c: Pick<Cobranca, "status" | "vencimento">, hoje = diaLocal()) {
  if (c.status === "paga") return { texto: "Paga", tom: "ok" as const };
  if (c.status === "cancelada") return { texto: "Cancelada", tom: "neutro" as const };
  if (estaAtrasada(c, hoje)) return { texto: "Em atraso", tom: "erro" as const };
  return { texto: "Em aberto", tom: "aviso" as const };
}
