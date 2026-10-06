import Link from "next/link";
import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, Numero, Rotulo, Selo, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { multaDevida, situacao } from "@/lib/dinheiro";
import { brl, dataBR, diaLocal, inicioDoMes, linkWhatsApp, somaDias } from "@/lib/formato";
import { ajustesAtuais } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { Cobranca, Perfil } from "@/lib/tipos";
import { gerarMensalidades, mudarCobranca, novaCobranca, registrarPagamento } from "../acoes";

export const metadata = { title: "Financeiro" };

const FORMAS = { pix: "PIX", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro", tap_to_pay: "Tap to Pay" };

export default async function FinanceiroAdmin({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const hoje = diaLocal();
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : hoje.slice(0, 7);
  const ini = `${mes}-01`;
  const fim = somaDias(inicioDoMes(somaDias(ini, 32)), -1);
  const anterior = somaDias(ini, -1).slice(0, 7);
  const proximo = somaDias(fim, 1).slice(0, 7);

  const ajustes = await ajustesAtuais();
  const supabase = await createClient();
  const [{ data }, { data: alunos }] = await Promise.all([
    supabase.from("invoices").select("*, profiles(nome, whatsapp)").gte("vencimento", ini).lte("vencimento", fim).order("vencimento").order("criado_em"),
    supabase.from("profiles").select("id, nome").eq("papel", "aluno").order("nome"),
  ]);
  const lista = (data ?? []) as Cobranca[];
  const validas = lista.filter((c) => c.status !== "cancelada");
  const previsto = validas.reduce((s, c) => s + c.valor_centavos, 0);
  const recebido = validas.filter((c) => c.status === "paga").reduce((s, c) => s + c.valor_centavos + c.multa_centavos, 0);
  const atraso = validas.filter((c) => situacao(c, hoje).tom === "erro").reduce((s, c) => s + c.valor_centavos, 0);
  const nomeMes = dataBR(ini, { month: "long", year: "numeric" }).replace(/^./, (l) => l.toUpperCase());

  return (
    <>
      <Titulo acao={<a href={`/admin/financeiro/csv?mes=${mes}`} className="btn btn-secundario px-3 py-2 text-sm">Exportar planilha</a>}>Financeiro</Titulo>

      <div className="mb-3 flex items-center justify-between">
        <Link href={`?mes=${anterior}`} className="btn btn-secundario px-3 py-1.5 text-sm">‹</Link>
        <p className="font-semibold">{nomeMes}</p>
        <Link href={`?mes=${proximo}`} className="btn btn-secundario px-3 py-1.5 text-sm">›</Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Numero rotulo="Previsto" valor={brl(previsto)} />
        <Numero rotulo="Recebido" valor={brl(recebido)} tom="ok" />
        <Numero rotulo="Em atraso" valor={brl(atraso)} tom={atraso ? "erro" : undefined} />
      </div>

      <Cartao className="mt-3">
        <Formulario acao={gerarMensalidades}>
          <input type="hidden" name="mes" value={mes} />
          <p className="text-sm text-muted">Cria as mensalidades de {nomeMes} para todos os planos ativos (não duplica).</p>
          <Enviar variante="secundario" className="w-full">Gerar mensalidades do mês</Enviar>
        </Formulario>
      </Cartao>

      <Subtitulo>Cobranças</Subtitulo>
      {lista.length === 0 && <Vazio>Nenhuma cobrança neste mês.</Vazio>}
      <div className="space-y-2">
        {lista.map((c) => {
          const s = situacao(c, hoje);
          const multa = c.status === "paga" ? c.multa_centavos : multaDevida(c, ajustes, hoje);
          const mensagem = `Oi ${c.profiles?.nome.split(" ")[0]}! Lembrete: "${c.descricao}" ${s.tom === "erro" ? `venceu em ${dataBR(c.vencimento)}` : `vence em ${dataBR(c.vencimento)}`}. Valor: ${brl(c.valor_centavos + multa)}${multa ? ` (com multa de ${brl(multa)})` : ""}.${ajustes.chave_pix ? ` PIX: ${ajustes.chave_pix}` : ""} Pode pagar também pelo app. Obrigado!`;
          return (
            <Cartao key={c.id} className="py-3">
              <details>
                <summary className="flex cursor-pointer items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{c.profiles?.nome}</span>
                    <span className="block truncate text-xs text-muted">{c.descricao} · {dataBR(c.vencimento, { day: "2-digit", month: "2-digit" })}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold">{brl(c.valor_centavos + multa)}</span>
                    <Selo tom={s.tom}>{c.status === "paga" && c.forma ? `${s.texto} · ${FORMAS[c.forma]}` : s.texto}</Selo>
                  </span>
                </summary>

                <div className="mt-3 space-y-3">
                  {c.status === "aberta" && (
                    <>
                      <a href={linkWhatsApp(c.profiles?.whatsapp, mensagem)} target="_blank" rel="noreferrer" className="btn btn-secundario w-full">Enviar cobrança no WhatsApp</a>
                      <Formulario acao={registrarPagamento} className="space-y-3 rounded-xl bg-surface-2 p-3">
                        <input type="hidden" name="id" value={c.id} />
                        <p className="text-sm font-semibold">Registrar pagamento</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Rotulo texto="Forma">
                            <select className="campo" name="forma" defaultValue="tap_to_pay">
                              {Object.entries(FORMAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </Rotulo>
                          <Rotulo texto="Parcelas">
                            <select className="campo" name="parcelas" defaultValue="1">
                              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}
                            </select>
                          </Rotulo>
                          <Rotulo texto="Multa (R$)"><input className="campo" name="multa" inputMode="decimal" defaultValue={(multa / 100).toFixed(2).replace(".", ",")} /></Rotulo>
                          <Rotulo texto="Taxa repassada (R$)"><input className="campo" name="taxa" inputMode="decimal" defaultValue="0" /></Rotulo>
                        </div>
                        <Rotulo texto="Data do pagamento"><input className="campo" type="date" name="pago_em" defaultValue={hoje} required /></Rotulo>
                        <Enviar className="w-full">Marcar como paga</Enviar>
                      </Formulario>
                    </>
                  )}
                  <div className="flex gap-2">
                    {c.status !== "aberta" && (
                      <form action={mudarCobranca.bind(null, c.id, "aberta")} className="flex-1"><button className="btn btn-secundario w-full text-sm">Reabrir</button></form>
                    )}
                    {c.status !== "cancelada" && (
                      <form action={mudarCobranca.bind(null, c.id, "cancelada")} className="flex-1"><button className="btn btn-perigo w-full text-sm">Cancelar cobrança</button></form>
                    )}
                  </div>
                </div>
              </details>
            </Cartao>
          );
        })}
      </div>

      <Subtitulo>Nova cobrança avulsa</Subtitulo>
      <Cartao>
        <Formulario acao={novaCobranca} limparAoSalvar>
          <Rotulo texto="Aluno">
            <select className="campo" name="aluno_id" required>
              {((alunos ?? []) as Pick<Perfil, "id" | "nome">[]).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </Rotulo>
          <div className="grid grid-cols-2 gap-3">
            <Rotulo texto="Tipo">
              <select className="campo" name="tipo" defaultValue="avaliacao">
                <option value="avaliacao">Avaliação</option>
                <option value="avulsa">Aula avulsa</option>
                <option value="dupla">Aula em dupla</option>
                <option value="mensalidade">Mensalidade</option>
                <option value="outro">Outro</option>
              </select>
            </Rotulo>
            <Rotulo texto="Valor (R$)"><input className="campo" name="valor" inputMode="decimal" required /></Rotulo>
          </div>
          <Rotulo texto="Descrição"><input className="campo" name="descricao" required placeholder="Avaliação postural e antropométrica" /></Rotulo>
          <Rotulo texto="Vencimento"><input className="campo" type="date" name="vencimento" defaultValue={hoje} required /></Rotulo>
          <Enviar className="w-full">Criar cobrança</Enviar>
        </Formulario>
      </Cartao>
    </>
  );
}
