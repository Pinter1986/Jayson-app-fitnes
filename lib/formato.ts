// Formatação em pt-BR, valores em centavos e horário de Jaraguá do Sul.
export const FUSO = "America/Sao_Paulo";

export function brl(centavos: number | null | undefined) {
  return ((centavos ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function paraCentavos(texto: string | number) {
  const n = typeof texto === "number" ? texto : Number(String(texto).replace(/\./g, "").replace(",", "."));
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

export function dataBR(valor: string | Date, opcoes: Intl.DateTimeFormatOptions = {}) {
  const d = typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(valor + "T12:00:00-03:00") : new Date(valor);
  return d.toLocaleDateString("pt-BR", { timeZone: FUSO, ...opcoes });
}

export function horaBR(valor: string | Date) {
  return new Date(valor).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
}

// "Terça-feira" / "Ter" (primeira letra maiúscula)
export function diaSemanaBR(valor: string | Date, formato: "long" | "short" = "short") {
  const s = dataBR(valor, { weekday: formato }).replace(".", "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// "AAAA-MM-DD" no fuso local
export function diaLocal(valor: Date | string = new Date()) {
  return new Date(valor).toLocaleDateString("en-CA", { timeZone: FUSO });
}

export function somaDias(dia: string, n: number) {
  const d = new Date(dia + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function inicioDoMes(dia: string = diaLocal()) {
  return dia.slice(0, 8) + "01";
}

// Brasil sem horário de verão desde 2019: UTC-3 fixo
export function instanteLocal(dia: string, hora: string) {
  return new Date(`${dia}T${hora.length === 5 ? hora + ":00" : hora}-03:00`).toISOString();
}

export function idade(nascimento: string | null) {
  if (!nascimento) return null;
  const hoje = diaLocal();
  let anos = Number(hoje.slice(0, 4)) - Number(nascimento.slice(0, 4));
  if (hoje.slice(5) < nascimento.slice(5)) anos--;
  return anos;
}

export function linkWhatsApp(numero: string | null | undefined, texto: string) {
  const digitos = (numero ?? "").replace(/\D/g, "");
  const comPais = digitos.length <= 11 && digitos ? "55" + digitos : digitos;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`;
}
