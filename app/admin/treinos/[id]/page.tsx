import Link from "next/link";
import { notFound } from "next/navigation";
import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, Rotulo, Subtitulo, Titulo, Voltar } from "@/components/ui";
import { dataBR } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { Exercicio, ItemTreino, RegistroTreino, Treino } from "@/lib/tipos";
import { apagarItem, apagarTreino, salvarItem, salvarTreino } from "../../acoes";

function CamposItem({ item, exercicios, ordem }: { item?: ItemTreino; exercicios: Exercicio[]; ordem: number }) {
  return (
    <>
      <Rotulo texto="Exercício">
        <select className="campo" name="exercicio_id" defaultValue={item?.exercicio_id ?? ""} required>
          <option value="" disabled>Escolha da biblioteca</option>
          {exercicios.map((e) => <option key={e.id} value={e.id}>{e.nome}{e.grupo ? ` · ${e.grupo}` : ""}</option>)}
        </select>
      </Rotulo>
      <div className="grid grid-cols-4 gap-2">
        <Rotulo texto="Séries"><input className="campo" name="series" inputMode="numeric" defaultValue={item?.series ?? ""} /></Rotulo>
        <Rotulo texto="Reps/tempo"><input className="campo" name="repeticoes" defaultValue={item?.repeticoes ?? ""} placeholder="10 a 12" /></Rotulo>
        <Rotulo texto="Carga"><input className="campo" name="carga_sugerida" defaultValue={item?.carga_sugerida ?? ""} placeholder="20 kg" /></Rotulo>
        <Rotulo texto="Descanso (s)"><input className="campo" name="descanso_seg" inputMode="numeric" defaultValue={item?.descanso_seg ?? ""} /></Rotulo>
      </div>
      <div className="grid grid-cols-[1fr_1fr_5rem] gap-2">
        <Rotulo texto="Técnica"><input className="campo" name="tecnica" defaultValue={item?.tecnica ?? ""} placeholder="drop-set" /></Rotulo>
        <Rotulo texto="Observação"><input className="campo" name="observacao" defaultValue={item?.observacao ?? ""} /></Rotulo>
        <Rotulo texto="Ordem"><input className="campo" name="ordem" inputMode="numeric" defaultValue={item?.ordem ?? ordem} /></Rotulo>
      </div>
    </>
  );
}

export default async function EditarTreino({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: treino }, { data: itens }, { data: exercicios }, { data: logs }] = await Promise.all([
    supabase.from("workouts").select("*, profiles(nome)").eq("id", id).maybeSingle(),
    supabase.from("workout_items").select("*, exercises(*)").eq("treino_id", id).order("ordem"),
    supabase.from("exercises").select("*").eq("ativo", true).order("nome"),
    supabase.from("workout_logs").select("*").eq("treino_id", id).order("criado_em", { ascending: false }).limit(60),
  ]);
  if (!treino) notFound();
  const t = treino as Treino & { profiles: { nome: string } | null };
  const lista = (itens ?? []) as ItemTreino[];
  const biblioteca = (exercicios ?? []) as Exercicio[];
  const registros = (logs ?? []) as RegistroTreino[];
  const voltar = t.aluno_id ? `/admin/alunos/${t.aluno_id}` : "/admin/treinos";

  return (
    <>
      <Voltar href={voltar}>{t.profiles?.nome ?? "Treinos"}</Voltar>
      <Titulo sub={t.aluno_id ? `${t.profiles?.nome} · publicado em ${dataBR(t.publicado_em)}` : "Modelo reutilizável"}>Treino {t.nome}</Titulo>

      <Cartao>
        <Formulario acao={salvarTreino}>
          <input type="hidden" name="id" value={t.id} />
          <div className="grid grid-cols-[1fr_5rem] gap-3">
            <Rotulo texto="Nome"><input className="campo" name="nome" defaultValue={t.nome} required /></Rotulo>
            <Rotulo texto="Ordem"><input className="campo" name="ordem" inputMode="numeric" defaultValue={t.ordem} /></Rotulo>
          </div>
          <Rotulo texto="Observação"><input className="campo" name="observacao" defaultValue={t.observacao ?? ""} /></Rotulo>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ativo" defaultChecked={t.ativo} /> Ativo (aparece para o aluno)</label>
          {t.aluno_id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publicar" /> Publicar como treino novo (zera o aviso de troca)</label>}
          <Enviar className="w-full">Salvar</Enviar>
        </Formulario>
      </Cartao>

      <Subtitulo acao={<Link href="/admin/exercicios" className="text-sm text-accent">Biblioteca ›</Link>}>Exercícios ({lista.length})</Subtitulo>
      <div className="space-y-3">
        {lista.map((item) => (
          <Cartao key={item.id}>
            <details>
              <summary className="cursor-pointer">
                <span className="font-semibold">{item.ordem}. {item.exercises?.nome}</span>
                <span className="ml-2 text-sm text-muted">
                  {[item.series && `${item.series}×`, item.repeticoes, item.carga_sugerida, item.descanso_seg && `${item.descanso_seg}s`, item.tecnica].filter(Boolean).join(" · ")}
                </span>
              </summary>
              <Formulario acao={salvarItem} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="treino_id" value={t.id} />
                <CamposItem item={item} exercicios={biblioteca} ordem={item.ordem} />
                <Enviar className="w-full" variante="secundario">Salvar exercício</Enviar>
              </Formulario>
              <form action={apagarItem.bind(null, item.id, t.id)} className="mt-2">
                <button className="text-sm text-err">Remover do treino</button>
              </form>
            </details>
          </Cartao>
        ))}
      </div>

      <Subtitulo>Adicionar exercício</Subtitulo>
      <Cartao>
        {biblioteca.length === 0 ? (
          <p className="text-sm text-muted">Cadastre exercícios na <Link href="/admin/exercicios" className="text-accent underline">biblioteca</Link> primeiro.</p>
        ) : (
          <Formulario acao={salvarItem} limparAoSalvar>
            <input type="hidden" name="treino_id" value={t.id} />
            <CamposItem exercicios={biblioteca} ordem={(lista[lista.length - 1]?.ordem ?? 0) + 1} />
            <Enviar className="w-full">Adicionar</Enviar>
          </Formulario>
        )}
      </Cartao>

      {t.aluno_id && (
        <>
          <Subtitulo>Cargas e esforço registrados</Subtitulo>
          <Cartao className="py-1 text-sm">
            {registros.length === 0 && <p className="py-3 text-muted">O aluno ainda não registrou este treino.</p>}
            {registros.map((r) => {
              const item = lista.find((i) => i.id === r.item_id);
              return (
                <div key={r.id} className="flex justify-between gap-2 border-b border-borda py-2 last:border-0">
                  <span>
                    {dataBR(r.data, { day: "2-digit", month: "2-digit" })} · {item ? item.exercises?.nome : `Cardio ${r.cardio_tipo ?? ""}`}
                    {r.observacao && <span className="block text-xs text-muted">{r.observacao}</span>}
                  </span>
                  <span className="shrink-0 text-muted">
                    {item ? `${r.carga_kg ?? "—"} kg × ${r.repeticoes ?? "—"}` : `${r.cardio_min ?? "—"} min ${r.cardio_km ? `${r.cardio_km} km` : ""}`}
                    {r.esforco ? ` · esf. ${r.esforco}` : ""}
                  </span>
                </div>
              );
            })}
          </Cartao>
        </>
      )}

      <form action={apagarTreino.bind(null, t.id, voltar)} className="mt-8">
        <button className="btn btn-perigo w-full">Apagar treino</button>
      </form>
    </>
  );
}
