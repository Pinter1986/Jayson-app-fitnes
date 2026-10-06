import { notFound } from "next/navigation";
import Grafico from "@/components/Grafico";
import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, Selo, Subtitulo, Titulo, Voltar } from "@/components/ui";
import { dataBR } from "@/lib/formato";
import { exigirAluno } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { ItemTreino, RegistroTreino, Treino } from "@/lib/tipos";
import { registrarSerie } from "../../acoes";

export default async function TreinoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirAluno();
  const supabase = await createClient();
  const [{ data: treino }, { data: itens }, { data: logs }] = await Promise.all([
    supabase.from("workouts").select("*").eq("id", id).maybeSingle(),
    supabase.from("workout_items").select("*, exercises(*)").eq("treino_id", id).order("ordem"),
    supabase.from("workout_logs").select("*").eq("treino_id", id).order("data").order("criado_em"),
  ]);
  if (!treino) notFound();
  const t = treino as Treino;
  const registros = (logs ?? []) as RegistroTreino[];
  const cardio = registros.filter((r) => !r.item_id).slice(-5).reverse();

  return (
    <>
      <Voltar href="/treino">Treinos</Voltar>
      <Titulo sub={t.observacao}>Treino {t.nome}</Titulo>

      <div className="space-y-3">
        {((itens ?? []) as ItemTreino[]).map((item, i) => {
          const doItem = registros.filter((r) => r.item_id === item.id);
          const ultimo = doItem[doItem.length - 1];
          // maior carga por dia, para o gráfico
          const porDia = new Map<string, number>();
          doItem.forEach((r) => r.carga_kg != null && porDia.set(r.data, Math.max(porDia.get(r.data) ?? 0, Number(r.carga_kg))));
          const pontos = [...porDia.entries()].slice(-12).map(([d, v]) => ({ rotulo: dataBR(d, { day: "2-digit", month: "2-digit" }), valor: v }));
          return (
            <Cartao key={item.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">{i + 1}. {item.exercises?.grupo}</p>
                  <h3 className="text-lg font-extrabold leading-tight">{item.exercises?.nome}</h3>
                </div>
                {item.exercises?.video_url && (
                  <a href={item.exercises.video_url} target="_blank" rel="noreferrer" className="btn btn-secundario shrink-0 px-3 py-1.5 text-sm">▶ Vídeo</a>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.series && <Selo>{item.series} séries</Selo>}
                {item.repeticoes && <Selo>{item.repeticoes} reps</Selo>}
                {item.carga_sugerida && <Selo>carga {item.carga_sugerida}</Selo>}
                {item.descanso_seg && <Selo>descanso {item.descanso_seg}s</Selo>}
                {(item.tecnica || item.exercises?.tecnica) && <Selo tom="marca">{item.tecnica || item.exercises?.tecnica}</Selo>}
              </div>
              {(item.observacao || item.exercises?.observacao) && (
                <p className="mt-2 text-sm text-muted">{item.observacao || item.exercises?.observacao}</p>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-accent">
                  Registrar{ultimo ? ` · último: ${ultimo.carga_kg ?? "—"} kg × ${ultimo.repeticoes ?? "—"}` : ""}
                </summary>
                <Formulario acao={registrarSerie} className="mt-3 space-y-2" limparAoSalvar>
                  <input type="hidden" name="treino_id" value={t.id} />
                  <input type="hidden" name="item_id" value={item.id} />
                  <div className="grid grid-cols-3 gap-2">
                    <input className="campo" name="carga_kg" inputMode="decimal" placeholder="kg" aria-label="Carga em kg" />
                    <input className="campo" name="repeticoes" inputMode="numeric" placeholder="reps" aria-label="Repetições feitas" />
                    <select className="campo" name="esforco" aria-label="Esforço de 1 a 10" defaultValue="">
                      <option value="">esforço</option>
                      {Array.from({ length: 10 }, (_, n) => (
                        <option key={n + 1} value={n + 1}>{n + 1}</option>
                      ))}
                    </select>
                  </div>
                  <input className="campo" name="observacao" placeholder="Observação (opcional)" />
                  <Enviar className="w-full">Salvar série</Enviar>
                </Formulario>
                {pontos.length > 1 && (
                  <div className="mt-3">
                    <Grafico pontos={pontos} unidade=" kg" />
                  </div>
                )}
              </details>
            </Cartao>
          );
        })}
      </div>

      <Subtitulo>Cardio</Subtitulo>
      <Cartao>
        <Formulario acao={registrarSerie} className="space-y-2" limparAoSalvar>
          <input type="hidden" name="treino_id" value={t.id} />
          <input className="campo" name="cardio_tipo" placeholder="Tipo (esteira, bike, escada…)" />
          <div className="grid grid-cols-2 gap-2">
            <input className="campo" name="cardio_min" inputMode="numeric" placeholder="minutos" />
            <input className="campo" name="cardio_km" inputMode="decimal" placeholder="km (opcional)" />
          </div>
          <Enviar className="w-full" variante="secundario">Salvar cardio</Enviar>
        </Formulario>
        {cardio.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {cardio.map((c) => (
              <li key={c.id}>{dataBR(c.data, { day: "2-digit", month: "2-digit" })} · {c.cardio_tipo} {c.cardio_min ? `${c.cardio_min} min` : ""} {c.cardio_km ? `${c.cardio_km} km` : ""}</li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}
