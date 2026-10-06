import Link from "next/link";
import { Cartao, Selo, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { multaDevida, situacao } from "@/lib/dinheiro";
import { brl, dataBR, diaLocal } from "@/lib/formato";
import { ajustesAtuais, exigirAluno } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { Assinatura, Cobranca, Plano } from "@/lib/tipos";
import Pagar from "./Pagar";

export const metadata = { title: "Financeiro" };

const STATUS_PLANO = { pendente: "Aguardando confirmação", ativa: "Ativo", cancelamento_pedido: "Cancelamento pedido", encerrada: "Encerrado" };

export default async function Financeiro() {
  const perfil = await exigirAluno();
  const ajustes = await ajustesAtuais();
  const supabase = await createClient();
  const hoje = diaLocal();

  const [{ data: assinatura }, { data: cobrancas }, { data: planos }] = await Promise.all([
    supabase.from("subscriptions").select("*, plans(*)").neq("status", "encerrada").maybeSingle(),
    supabase.from("invoices").select("*").neq("status", "cancelada").order("vencimento", { ascending: false }),
    supabase.from("plans").select("*").eq("ativo", true).order("ordem"),
  ]);
  const plano = assinatura as Assinatura | null;
  const lista = (cobrancas ?? []) as Cobranca[];
  const abertas = lista.filter((c) => c.status === "aberta").reverse();
  const pagas = lista.filter((c) => c.status === "paga");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <>
      <Titulo>Financeiro</Titulo>

      <Cartao>
        <p className="text-xs uppercase tracking-wide text-muted">Seu plano</p>
        {plano ? (
          <>
            <p className="mt-1 font-titulo text-xl font-extrabold">{plano.plans?.nome}</p>
            <p className="text-sm text-muted">
              {brl(plano.valor_centavos)} · vence dia {plano.dia_vencimento} · <Selo tom={plano.status === "ativa" ? "ok" : "aviso"}>{STATUS_PLANO[plano.status]}</Selo>
            </p>
            {plano.fim && <p className="mt-1 text-sm text-muted">Ativo até {dataBR(plano.fim)}</p>}
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">Sem plano. Você pode marcar aula avulsa ou escolher um plano abaixo.</p>
        )}
      </Cartao>

      <Subtitulo>Em aberto</Subtitulo>
      {abertas.length ? (
        <div className="space-y-3">
          {abertas.map((c) => {
            const multa = multaDevida(c, ajustes, hoje);
            const s = situacao(c, hoje);
            return (
              <Cartao key={c.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.descricao}</p>
                    <p className="text-sm text-muted">Vencimento {dataBR(c.vencimento)}</p>
                  </div>
                  <Selo tom={s.tom}>{s.texto}</Selo>
                </div>
                <p className="mt-2 font-titulo text-2xl font-extrabold">{brl(c.valor_centavos + multa)}</p>
                {multa > 0 && <p className="text-xs text-muted">Inclui multa de {brl(multa)}</p>}
                <Pagar
                  valorCentavos={c.valor_centavos + multa}
                  taxas={ajustes.taxas_cartao}
                  exemplo={ajustes.taxas_sao_exemplo}
                  chavePix={ajustes.chave_pix}
                  whatsapp={ajustes.whatsapp}
                  descricao={c.descricao}
                />
              </Cartao>
            );
          })}
        </div>
      ) : (
        <Vazio>Nada em aberto. 💪</Vazio>
      )}

      <Subtitulo>Histórico e recibos</Subtitulo>
      {pagas.length ? (
        <Cartao className="divide-y divide-borda p-0">
          {pagas.map((c) => (
            <Link key={c.id} href={`/financeiro/recibo/${c.id}`} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold">{c.descricao}</p>
                <p className="text-xs text-muted">Pago em {c.pago_em ? dataBR(c.pago_em) : "—"}</p>
              </div>
              <span className="text-sm">{brl(c.valor_centavos + c.multa_centavos + c.taxa_centavos)} ›</span>
            </Link>
          ))}
        </Cartao>
      ) : (
        <Vazio>Nenhum pagamento registrado ainda.</Vazio>
      )}

      <Subtitulo>Planos</Subtitulo>
      <Cartao className="divide-y divide-borda p-0">
        {((planos ?? []) as Plano[]).map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold">{p.nome}</p>
              {p.descricao && <p className="text-xs text-muted">{p.descricao}</p>}
            </div>
            <p className="shrink-0 text-sm font-semibold">{brl(p.preco_centavos)}{p.tipo === "presencial" || (p.tipo === "online" && p.meses === 1) ? "/mês" : ""}</p>
          </div>
        ))}
      </Cartao>
      <p className="mt-2 text-xs text-muted">Para mudar de plano, fale com o Jayson.</p>

      <Subtitulo>Indique um amigo</Subtitulo>
      <Cartao>
        <p className="text-sm">Quem você indicar entra pelo seu link. Quando a pessoa pagar a primeira mensalidade, você ganha desconto no plano.</p>
        <p className="mt-2 break-all rounded-xl bg-surface-2 p-3 text-sm">{site}/cadastro?ref={perfil.codigo_indicacao}</p>
      </Cartao>
    </>
  );
}
