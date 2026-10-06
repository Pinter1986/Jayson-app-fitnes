import Link from "next/link";
import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, LinkLinha, Rotulo, Selo, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { estaAtrasada } from "@/lib/dinheiro";
import { brl, diaLocal } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { Perfil, Plano } from "@/lib/tipos";
import { novoAluno } from "../acoes";

export const metadata = { title: "Alunos" };

const FILTROS = [
  { id: "ativos", rotulo: "Ativos" },
  { id: "presencial", rotulo: "Presencial" },
  { id: "online", rotulo: "Online" },
  { id: "atraso", rotulo: "Em atraso" },
  { id: "inativos", rotulo: "Inativos" },
  { id: "todos", rotulo: "Todos" },
];

type Linha = Perfil & {
  subscriptions: { status: string; valor_centavos: number; dia_vencimento: number; plans: { nome: string; tipo: string } }[];
  invoices: { status: "aberta" | "paga" | "cancelada"; vencimento: string }[];
};

export default async function Alunos({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { q = "", f = "ativos" } = await searchParams;
  const supabase = await createClient();
  const hoje = diaLocal();

  let consulta = supabase
    .from("profiles")
    .select("*, subscriptions(status, valor_centavos, dia_vencimento, plans(nome, tipo)), invoices(status, vencimento)")
    .eq("papel", "aluno")
    .order("nome");
  if (q) consulta = consulta.ilike("nome", `%${q}%`);
  const [{ data }, { data: planos }] = await Promise.all([consulta, supabase.from("plans").select("*").eq("ativo", true).order("ordem")]);

  const linhas = ((data ?? []) as Linha[])
    .map((a) => ({
      ...a,
      viva: a.subscriptions.find((s) => s.status !== "encerrada"),
      atraso: a.invoices.some((c) => estaAtrasada(c, hoje)),
    }))
    .filter((a) => {
      if (f === "todos") return true;
      if (f === "inativos") return !a.ativo;
      if (!a.ativo) return false;
      if (f === "presencial") return a.viva?.plans.tipo === "presencial";
      if (f === "online") return a.viva?.plans.tipo === "online";
      if (f === "atraso") return a.atraso;
      return true;
    });

  return (
    <>
      <Titulo sub={`${linhas.length} aluno(s)`}>Alunos</Titulo>
      <form className="mb-3 flex gap-2">
        <input className="campo" name="q" defaultValue={q} placeholder="Buscar por nome" />
        <input type="hidden" name="f" value={f} />
        <button className="btn btn-secundario">Buscar</button>
      </form>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((x) => (
          <Link key={x.id} href={`?f=${x.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${f === x.id ? "bg-accent text-accent-text" : "bg-surface-2"}`}>
            {x.rotulo}
          </Link>
        ))}
      </div>

      {linhas.length === 0 ? (
        <Vazio>Nenhum aluno encontrado.</Vazio>
      ) : (
        <Cartao className="py-1">
          {linhas.map((a) => (
            <LinkLinha
              key={a.id}
              href={`/admin/alunos/${a.id}`}
              direita={a.atraso ? <Selo tom="erro">atraso</Selo> : a.viva?.status === "pendente" ? <Selo tom="aviso">pendente</Selo> : !a.ativo ? <Selo>inativo</Selo> : null}
            >
              <p className="font-semibold">{a.nome}</p>
              <p className="text-sm text-muted">
                {a.viva ? `${a.viva.plans.nome} · ${brl(a.viva.valor_centavos)} · dia ${a.viva.dia_vencimento}` : "Sem plano"}
              </p>
            </LinkLinha>
          ))}
        </Cartao>
      )}

      <Subtitulo>Cadastrar aluno</Subtitulo>
      <Cartao>
        <p className="mb-3 text-sm text-muted">
          Para importar os alunos atuais. Depois, o aluno entra em <b>Esqueci minha senha</b> com o e-mail dele para criar a senha e aceita os termos no primeiro acesso.
        </p>
        <Formulario acao={novoAluno}>
          <Rotulo texto="Nome"><input className="campo" name="nome" required /></Rotulo>
          <Rotulo texto="E-mail"><input className="campo" type="email" name="email" required /></Rotulo>
          <div className="grid grid-cols-2 gap-3">
            <Rotulo texto="WhatsApp"><input className="campo" type="tel" name="whatsapp" /></Rotulo>
            <Rotulo texto="Nascimento"><input className="campo" type="date" name="nascimento" /></Rotulo>
          </div>
          <Rotulo texto="Sexo">
            <select className="campo" name="sexo" defaultValue="">
              <option value="">—</option><option value="F">Feminino</option><option value="M">Masculino</option>
            </select>
          </Rotulo>
          <Rotulo texto="Plano">
            <select className="campo" name="plano_id" defaultValue="">
              <option value="">Sem plano</option>
              {((planos ?? []) as Plano[]).filter((p) => p.tipo === "presencial" || p.tipo === "online").map((p) => (
                <option key={p.id} value={p.id}>{p.nome} · {brl(p.preco_centavos)}</option>
              ))}
            </select>
          </Rotulo>
          <div className="grid grid-cols-3 gap-3">
            <Rotulo texto="Valor (R$)"><input className="campo" name="valor" inputMode="decimal" placeholder="300" /></Rotulo>
            <Rotulo texto="Vence dia">
              <select className="campo" name="dia_vencimento" defaultValue="10"><option value="5">5</option><option value="10">10</option></select>
            </Rotulo>
            <Rotulo texto="Início"><input className="campo" type="date" name="inicio" defaultValue={hoje} /></Rotulo>
          </div>
          <Enviar className="w-full">Cadastrar</Enviar>
        </Formulario>
      </Cartao>
    </>
  );
}
