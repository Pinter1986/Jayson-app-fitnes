import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, Rotulo, Subtitulo, Titulo, Voltar } from "@/components/ui";
import { brl } from "@/lib/formato";
import { ajustesAtuais } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { Academia, Plano, TextoLegal } from "@/lib/tipos";
import { salvarAcademia, salvarAjustes, salvarHorarios, salvarPlano, salvarTextoLegal } from "../acoes";

export const metadata = { title: "Ajustes" };

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const TIPOS = ["presencial", "online", "avulsa", "dupla", "avaliacao"];
const TEXTOS = [
  { chave: "contrato", titulo: "Contrato de prestação de serviço" },
  { chave: "termos_privacidade", titulo: "Termos de uso e privacidade" },
  { chave: "responsabilidade", titulo: "Termo de responsabilidade" },
  { chave: "fotos_acompanhamento", titulo: "Autorização de fotos (acompanhamento)" },
  { chave: "divulgacao", titulo: "Autorização de divulgação" },
] as const;

function CamposPlano({ p }: { p?: Plano }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Rotulo texto="Nome"><input className="campo" name="nome" defaultValue={p?.nome} required /></Rotulo>
        <Rotulo texto="Tipo">
          <select className="campo" name="tipo" defaultValue={p?.tipo ?? "presencial"}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
        </Rotulo>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Rotulo texto="Preço (R$)"><input className="campo" name="preco" inputMode="decimal" defaultValue={p ? (p.preco_centavos / 100).toFixed(2).replace(".", ",") : ""} required /></Rotulo>
        <Rotulo texto="Aulas/mês"><input className="campo" name="aulas_mes" inputMode="numeric" defaultValue={p?.aulas_mes ?? ""} /></Rotulo>
        <Rotulo texto="Aulas/sem."><input className="campo" name="aulas_semana" inputMode="numeric" defaultValue={p?.aulas_semana ?? ""} /></Rotulo>
        <Rotulo texto="Meses"><input className="campo" name="meses" inputMode="numeric" defaultValue={p?.meses ?? 1} /></Rotulo>
      </div>
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <Rotulo texto="Descrição"><input className="campo" name="descricao" defaultValue={p?.descricao ?? ""} /></Rotulo>
        <Rotulo texto="Ordem"><input className="campo" name="ordem" inputMode="numeric" defaultValue={p?.ordem ?? 0} /></Rotulo>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={p?.ativo ?? true} /> Ativo (aparece para os alunos)</label>
    </>
  );
}

export default async function Ajustes() {
  const a = await ajustesAtuais();
  const supabase = await createClient();
  const [{ data: planos }, { data: academias }, { data: horarios }] = await Promise.all([
    supabase.from("plans").select("*").order("ordem"),
    supabase.from("gyms").select("*").order("ordem"),
    supabase.from("availability").select("*"),
  ]);
  const grade = (horarios ?? []) as { dia_semana: number; hora_inicio: string; hora_fim: string }[];
  const credito = a.taxas_cartao?.credito ?? {};

  return (
    <>
      <Voltar href="/admin">Painel</Voltar>
      <Titulo sub="Tudo aqui vale na hora para os alunos.">Ajustes</Titulo>

      <Formulario acao={salvarAjustes} className="space-y-4">
        <Cartao className="space-y-3">
          <h2 className="font-extrabold">Agenda</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Rotulo texto="Duração da aula (min)"><input className="campo" name="duracao_aula_min" type="number" min={15} defaultValue={a.duracao_aula_min} /></Rotulo>
            <Rotulo texto="Alunos por horário"><input className="campo" name="alunos_por_horario" type="number" min={1} defaultValue={a.alunos_por_horario} /></Rotulo>
            <Rotulo texto="Agenda abre (dias)"><input className="campo" name="abertura_dias" type="number" min={0} defaultValue={a.abertura_dias} /></Rotulo>
            <Rotulo texto="Antecedência mínima (h)"><input className="campo" name="antecedencia_min_horas" type="number" min={0} defaultValue={a.antecedencia_min_horas} /></Rotulo>
            <Rotulo texto="Cancelar sem perder (h)"><input className="campo" name="cancelamento_horas" type="number" min={0} defaultValue={a.cancelamento_horas} /></Rotulo>
          </div>
        </Cartao>

        <Cartao className="space-y-3">
          <h2 className="font-extrabold">Cobrança</h2>
          <div className="grid grid-cols-2 gap-3">
            <Rotulo texto="Multa por atraso (%)"><input className="campo" name="multa_pct" inputMode="decimal" defaultValue={a.multa_pct} /></Rotulo>
            <Rotulo texto="Juros de mora (% ao mês)"><input className="campo" name="juros_mes_pct" inputMode="decimal" defaultValue={a.juros_mes_pct} /></Rotulo>
            <Rotulo texto="Chave PIX"><input className="campo" name="chave_pix" defaultValue={a.chave_pix ?? ""} /></Rotulo>
            <Rotulo texto="WhatsApp do Jayson"><input className="campo" name="whatsapp" defaultValue={a.whatsapp ?? ""} /></Rotulo>
          </div>
          <p className="text-sm font-semibold">Taxas do cartão (%), repassadas ao aluno</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            <Rotulo texto="Débito"><input className="campo" name="debito" inputMode="decimal" defaultValue={a.taxas_cartao?.debito ?? 0} /></Rotulo>
            {Array.from({ length: 12 }, (_, i) => (
              <Rotulo key={i} texto={`${i + 1}x`}><input className="campo" name={`credito_${i + 1}`} inputMode="decimal" defaultValue={credito[String(i + 1)] ?? 0} /></Rotulo>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="taxas_sao_exemplo" defaultChecked={a.taxas_sao_exemplo} /> Taxas ainda são de exemplo (mostra aviso ao aluno)</label>
        </Cartao>

        <Cartao className="space-y-3">
          <h2 className="font-extrabold">Combinados e página de vendas</h2>
          <Rotulo texto="Combinados com os alunos"><textarea className="campo" name="combinados" rows={3} defaultValue={a.combinados} /></Rotulo>
          <Rotulo texto="Título da página de vendas"><input className="campo" name="vendas_titulo" defaultValue={a.textos?.vendas_titulo ?? ""} /></Rotulo>
          <Rotulo texto="Bio"><textarea className="campo" name="vendas_bio" rows={2} defaultValue={a.textos?.vendas_bio ?? ""} /></Rotulo>
        </Cartao>

        <Enviar className="w-full">Salvar ajustes</Enviar>
      </Formulario>

      <Subtitulo>Horários de atendimento</Subtitulo>
      <Cartao>
        <Formulario acao={salvarHorarios} className="space-y-2">
          {DIAS.map((nome, d) => {
            const h = grade.find((g) => g.dia_semana === d);
            return (
              <div key={d} className="grid grid-cols-[6.5rem_1fr_1fr] items-center gap-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={`aberto_${d}`} defaultChecked={!!h} /> {nome}</label>
                <input className="campo" type="time" name={`ini_${d}`} defaultValue={h?.hora_inicio.slice(0, 5) ?? "05:00"} aria-label={`${nome} início`} />
                <input className="campo" type="time" name={`fim_${d}`} defaultValue={h?.hora_fim.slice(0, 5) ?? "22:00"} aria-label={`${nome} fim`} />
              </div>
            );
          })}
          <Enviar variante="secundario" className="w-full">Salvar horários</Enviar>
        </Formulario>
      </Cartao>

      <Subtitulo>Academias</Subtitulo>
      <div className="space-y-2">
        {((academias ?? []) as Academia[]).map((g) => (
          <Cartao key={g.id} className="py-3">
            <Formulario acao={salvarAcademia} className="grid grid-cols-[1fr_6rem_4rem_auto] items-end gap-2">
              <input type="hidden" name="id" value={g.id} />
              <Rotulo texto="Nome"><input className="campo" name="nome" defaultValue={g.nome} /></Rotulo>
              <Rotulo texto="Desloc. (min)"><input className="campo" name="intervalo_min" inputMode="numeric" defaultValue={g.intervalo_min} /></Rotulo>
              <Rotulo texto="Ordem"><input className="campo" name="ordem" inputMode="numeric" defaultValue={g.ordem} /></Rotulo>
              <div className="flex flex-col gap-1 pb-1">
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="ativo" defaultChecked={g.ativo} /> ativa</label>
                <Enviar variante="secundario" className="px-3 py-1.5 text-sm">Salvar</Enviar>
              </div>
            </Formulario>
          </Cartao>
        ))}
        <Cartao className="py-3">
          <Formulario acao={salvarAcademia} className="grid grid-cols-[1fr_6rem_auto] items-end gap-2" limparAoSalvar>
            <input type="hidden" name="ativo" value="on" />
            <Rotulo texto="Nova academia"><input className="campo" name="nome" required /></Rotulo>
            <Rotulo texto="Desloc. (min)"><input className="campo" name="intervalo_min" inputMode="numeric" defaultValue={30} /></Rotulo>
            <Enviar className="mb-0.5 px-3 py-2 text-sm">Adicionar</Enviar>
          </Formulario>
        </Cartao>
      </div>

      <Subtitulo>Planos e preços</Subtitulo>
      <div className="space-y-2">
        {((planos ?? []) as Plano[]).map((p) => (
          <Cartao key={p.id} className="py-3">
            <details>
              <summary className="cursor-pointer">
                <span className={`font-semibold ${p.ativo ? "" : "text-muted line-through"}`}>{p.nome}</span>
                <span className="ml-2 text-sm text-muted">{brl(p.preco_centavos)} · {p.tipo}{p.aulas_mes ? ` · ${p.aulas_mes} aulas/mês` : ""}</span>
              </summary>
              <Formulario acao={salvarPlano} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <CamposPlano p={p} />
                <Enviar variante="secundario" className="w-full">Salvar plano</Enviar>
              </Formulario>
            </details>
          </Cartao>
        ))}
        <Cartao className="py-3">
          <details>
            <summary className="cursor-pointer font-semibold text-accent">+ Novo plano</summary>
            <Formulario acao={salvarPlano} className="mt-3 space-y-3" limparAoSalvar>
              <CamposPlano />
              <Enviar className="w-full">Criar plano</Enviar>
            </Formulario>
          </details>
        </Cartao>
      </div>
      <p className="mt-2 text-xs text-muted">Mudar o preço de um plano não altera o valor de quem já é aluno; ajuste na ficha do aluno.</p>

      <Subtitulo>Contrato e termos</Subtitulo>
      <p className="mb-2 text-xs text-muted">Ao mudar a <b>versão</b>, todos os alunos aceitam o texto novo no próximo acesso. Revise com advogado antes de publicar.</p>
      <div className="space-y-2">
        {TEXTOS.map(({ chave, titulo }) => {
          const t = a.textos?.[chave] as TextoLegal | undefined;
          return (
            <Cartao key={chave} className="py-3">
              <details>
                <summary className="cursor-pointer"><span className="font-semibold">{titulo}</span> <span className="text-sm text-muted">v. {t?.versao ?? "—"}</span></summary>
                <Formulario acao={salvarTextoLegal} className="mt-3 space-y-3">
                  <input type="hidden" name="chave" value={chave} />
                  <Rotulo texto="Versão"><input className="campo" name="versao" defaultValue={t?.versao ?? "1"} required /></Rotulo>
                  <Rotulo texto="Texto"><textarea className="campo" name="texto" rows={10} defaultValue={t?.texto ?? ""} /></Rotulo>
                  <Enviar variante="secundario" className="w-full">Salvar texto</Enviar>
                </Formulario>
              </details>
            </Cartao>
          );
        })}
      </div>
    </>
  );
}
