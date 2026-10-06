import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, Rotulo, Subtitulo, Titulo, Voltar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type { Exercicio } from "@/lib/tipos";
import { salvarExercicio } from "../acoes";

export const metadata = { title: "Exercícios" };

function Campos({ e }: { e?: Exercicio }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Rotulo texto="Nome"><input className="campo" name="nome" defaultValue={e?.nome} required /></Rotulo>
        <Rotulo texto="Grupo"><input className="campo" name="grupo" defaultValue={e?.grupo ?? ""} placeholder="Peito, costas…" /></Rotulo>
      </div>
      <Rotulo texto="Vídeo" dica="Link do YouTube não listado ou do Storage"><input className="campo" name="video_url" type="url" defaultValue={e?.video_url ?? ""} /></Rotulo>
      <div className="grid grid-cols-2 gap-3">
        <Rotulo texto="Técnica padrão"><input className="campo" name="tecnica" defaultValue={e?.tecnica ?? ""} /></Rotulo>
        <Rotulo texto="Observação"><input className="campo" name="observacao" defaultValue={e?.observacao ?? ""} /></Rotulo>
      </div>
    </>
  );
}

export default async function Exercicios() {
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("*").order("grupo").order("nome");
  const lista = (data ?? []) as Exercicio[];

  return (
    <>
      <Voltar href="/admin/treinos">Treinos</Voltar>
      <Titulo sub="Cadastro único, usado em todos os treinos.">Biblioteca de exercícios</Titulo>
      <Cartao>
        <Formulario acao={salvarExercicio} limparAoSalvar>
          <Campos />
          <Enviar className="w-full">Adicionar exercício</Enviar>
        </Formulario>
      </Cartao>

      <Subtitulo>{lista.length} exercício(s)</Subtitulo>
      <div className="space-y-2">
        {lista.map((e) => (
          <Cartao key={e.id} className="py-3">
            <details>
              <summary className="cursor-pointer">
                <span className={`font-semibold ${e.ativo ? "" : "text-muted line-through"}`}>{e.nome}</span>
                <span className="ml-2 text-sm text-muted">{e.grupo}{e.video_url ? " · ▶" : ""}</span>
              </summary>
              <Formulario acao={salvarExercicio} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={e.id} />
                <Campos e={e} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={e.ativo} /> Ativo</label>
                <Enviar variante="secundario" className="w-full">Salvar</Enviar>
              </Formulario>
            </details>
          </Cartao>
        ))}
      </div>
    </>
  );
}
