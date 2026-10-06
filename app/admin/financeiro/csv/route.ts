import { NextResponse, type NextRequest } from "next/server";
import { inicioDoMes, somaDias } from "@/lib/formato";
import { perfilAtual } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";

// Planilha do mês (abre no Excel/Google Planilhas): separador ; e decimal com vírgula
export async function GET(request: NextRequest) {
  const perfil = await perfilAtual();
  if (perfil?.papel !== "admin") return NextResponse.json({ erro: "Sem permissão" }, { status: 403 });

  const mes = request.nextUrl.searchParams.get("mes") ?? new Date().toISOString().slice(0, 7);
  const ini = `${mes}-01`;
  const fim = somaDias(inicioDoMes(somaDias(ini, 32)), -1);
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select("*, profiles(nome)").gte("vencimento", ini).lte("vencimento", fim).order("vencimento");

  const reais = (c: number) => (c / 100).toFixed(2).replace(".", ",");
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = [
    ["Aluno", "Descrição", "Tipo", "Vencimento", "Valor", "Multa", "Taxa", "Total", "Status", "Forma", "Parcelas", "Pago em"].join(";"),
    ...(data ?? []).map((c) =>
      [
        esc(c.profiles?.nome), esc(c.descricao), c.tipo, c.vencimento, reais(c.valor_centavos), reais(c.multa_centavos), reais(c.taxa_centavos),
        reais(c.valor_centavos + c.multa_centavos + c.taxa_centavos), c.status, c.forma ?? "", c.parcelas, c.pago_em ? String(c.pago_em).slice(0, 10) : "",
      ].join(";"),
    ),
  ];
  return new NextResponse("﻿" + linhas.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="financeiro-${mes}.csv"` },
  });
}
