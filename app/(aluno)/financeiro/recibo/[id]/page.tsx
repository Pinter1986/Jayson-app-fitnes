import { notFound } from "next/navigation";
import { Voltar } from "@/components/ui";
import { brl, dataBR } from "@/lib/formato";
import { exigirAluno } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { Cobranca } from "@/lib/tipos";

export const metadata = { title: "Comprovante" };

const FORMAS = { pix: "PIX", credito: "Cartão de crédito", debito: "Cartão de débito", dinheiro: "Dinheiro", tap_to_pay: "Cartão (Tap to Pay)" };

export default async function Recibo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await exigirAluno();
  const supabase = await createClient();
  const { data } = await supabase.from("invoices").select("*").eq("id", id).eq("status", "paga").maybeSingle();
  if (!data) notFound();
  const c = data as Cobranca;

  return (
    <>
      <Voltar href="/financeiro">Financeiro</Voltar>
      <article className="rounded-2xl bg-white p-6 text-black">
        <p className="font-titulo text-lg font-extrabold">Jayson <i className="text-[#E8391D]">Lucian</i></p>
        <p className="text-xs text-neutral-500">Personal Trainer · CREF 018556-G/SC</p>
        <h1 className="mt-6 text-xl font-extrabold">Comprovante de pagamento</h1>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-neutral-500">Aluno</dt><dd className="text-right">{perfil.nome}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-neutral-500">Referente a</dt><dd className="text-right">{c.descricao}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-neutral-500">Valor</dt><dd>{brl(c.valor_centavos)}</dd></div>
          {c.multa_centavos > 0 && <div className="flex justify-between gap-4"><dt className="text-neutral-500">Multa</dt><dd>{brl(c.multa_centavos)}</dd></div>}
          {c.taxa_centavos > 0 && <div className="flex justify-between gap-4"><dt className="text-neutral-500">Taxa do cartão</dt><dd>{brl(c.taxa_centavos)}</dd></div>}
          <div className="flex justify-between gap-4 border-t pt-2 font-bold"><dt>Total pago</dt><dd>{brl(c.valor_centavos + c.multa_centavos + c.taxa_centavos)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-neutral-500">Forma</dt><dd>{c.forma ? FORMAS[c.forma] : "—"}{c.parcelas > 1 ? ` em ${c.parcelas}x` : ""}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-neutral-500">Data</dt><dd>{c.pago_em ? dataBR(c.pago_em) : "—"}</dd></div>
        </dl>
        <p className="mt-6 text-[10px] text-neutral-500">Comprovante simples, não é nota fiscal. Código {c.id.slice(0, 8)}.</p>
      </article>
    </>
  );
}
