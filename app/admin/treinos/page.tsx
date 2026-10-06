import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, LinkLinha, Rotulo, Selo, Subtitulo, Titulo } from "@/components/ui";
import { dataBR, diaLocal, somaDias } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { Perfil, Treino } from "@/lib/tipos";
import { novoTreino } from "../acoes";

export const metadata = { title: "Treinos" };

type TreinoComAluno = Treino & { profiles: { nome: string } | null };

export default async function Treinos({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const { aluno } = await searchParams;
  const supabase = await createClient();
  const [{ data: treinos }, { data: alunos }] = await Promise.all([
    supabase.from("workouts").select("*, profiles(nome)").order("ordem"),
    supabase.from("profiles").select("id, nome").eq("papel", "aluno").eq("ativo", true).order("nome"),
  ]);
  const lista = (treinos ?? []) as TreinoComAluno[];
  const modelos = lista.filter((t) => !t.aluno_id);
  const limite = somaDias(diaLocal(), -30);

  const porAluno = new Map<string, TreinoComAluno[]>();
  lista.filter((t) => t.aluno_id && (!aluno || t.aluno_id === aluno)).forEach((t) => porAluno.set(t.aluno_id!, [...(porAluno.get(t.aluno_id!) ?? []), t]));
  const grupos = [...porAluno.entries()].sort((a, b) => (a[1][0].profiles?.nome ?? "").localeCompare(b[1][0].profiles?.nome ?? ""));

  return (
    <>
      <Titulo sub="Monte por aluno, copie de outro aluno ou use um modelo.">Treinos</Titulo>

      <Cartao>
        <Formulario acao={novoTreino}>
          <Rotulo texto="Para">
            <select className="campo" name="aluno_id" defaultValue={aluno ?? ""}>
              <option value="">Modelo reutilizável</option>
              {((alunos ?? []) as Pick<Perfil, "id" | "nome">[]).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </Rotulo>
          <div className="grid grid-cols-2 gap-3">
            <Rotulo texto="Nome" dica="A, B, C, Upper, Full body…"><input className="campo" name="nome" required placeholder="A" /></Rotulo>
            <Rotulo texto="Copiar exercícios de">
              <select className="campo" name="copiar_de" defaultValue="">
                <option value="">Começar vazio</option>
                <optgroup label="Modelos">{modelos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</optgroup>
                <optgroup label="Treinos de alunos">
                  {lista.filter((t) => t.aluno_id).map((t) => <option key={t.id} value={t.id}>{t.profiles?.nome} · {t.nome}</option>)}
                </optgroup>
              </select>
            </Rotulo>
          </div>
          <Rotulo texto="Observação (opcional)"><input className="campo" name="observacao" /></Rotulo>
          <Enviar className="w-full">Criar treino</Enviar>
        </Formulario>
      </Cartao>

      <Subtitulo>Modelos</Subtitulo>
      <Cartao className="py-1">
        {modelos.length === 0 && <p className="py-3 text-sm text-muted">Nenhum modelo ainda.</p>}
        {modelos.map((t) => (
          <LinkLinha key={t.id} href={`/admin/treinos/${t.id}`}><p className="font-semibold">{t.nome}</p></LinkLinha>
        ))}
      </Cartao>

      <Subtitulo>Por aluno</Subtitulo>
      {grupos.length === 0 && <p className="text-sm text-muted">Nenhum treino de aluno.</p>}
      <div className="space-y-3">
        {grupos.map(([id, ts]) => (
          <Cartao key={id} className="py-1">
            <p className="pt-3 text-sm font-semibold text-muted">{ts[0].profiles?.nome}</p>
            {ts.map((t) => (
              <LinkLinha
                key={t.id}
                href={`/admin/treinos/${t.id}`}
                direita={!t.ativo ? <Selo>inativo</Selo> : diaLocal(t.publicado_em) < limite ? <Selo tom="aviso">trocar</Selo> : <span className="text-xs">{dataBR(t.publicado_em, { day: "2-digit", month: "2-digit" })}</span>}
              >
                <p className="font-semibold">Treino {t.nome}</p>
              </LinkLinha>
            ))}
          </Cartao>
        ))}
      </div>
    </>
  );
}
