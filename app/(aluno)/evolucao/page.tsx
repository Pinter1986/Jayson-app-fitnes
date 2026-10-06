import Grafico from "@/components/Grafico";
import { Cartao, Subtitulo, Titulo, Vazio } from "@/components/ui";
import { dataBR } from "@/lib/formato";
import { exigirAluno } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Evolução" };

type Avaliacao = { id: string; data: string; peso_kg: number | null; gordura_pct: number | null; observacao: string | null };

export default async function Evolucao() {
  await exigirAluno();
  const supabase = await createClient();
  const { data } = await supabase.from("assessments").select("id, data, peso_kg, gordura_pct, observacao").order("data");
  const avaliacoes = (data ?? []) as Avaliacao[];
  const peso = avaliacoes.filter((a) => a.peso_kg != null).map((a) => ({ rotulo: dataBR(a.data, { day: "2-digit", month: "2-digit", year: "2-digit" }), valor: Number(a.peso_kg) }));
  const gordura = avaliacoes.filter((a) => a.gordura_pct != null).map((a) => ({ rotulo: dataBR(a.data, { day: "2-digit", month: "2-digit", year: "2-digit" }), valor: Number(a.gordura_pct) }));

  return (
    <>
      <Titulo sub="Avaliações feitas pelo Jayson. Reavaliação a cada 3 meses.">Evolução</Titulo>
      {avaliacoes.length === 0 && <Vazio>Sua primeira avaliação aparece aqui assim que o Jayson registrar.</Vazio>}

      {peso.length > 1 && (
        <>
          <Subtitulo>Peso</Subtitulo>
          <Cartao><Grafico pontos={peso} unidade=" kg" /></Cartao>
        </>
      )}
      {gordura.length > 1 && (
        <>
          <Subtitulo>% de gordura</Subtitulo>
          <Cartao><Grafico pontos={gordura} unidade="%" /></Cartao>
        </>
      )}

      {avaliacoes.length > 0 && (
        <>
          <Subtitulo>Avaliações</Subtitulo>
          <Cartao className="divide-y divide-borda p-0">
            {[...avaliacoes].reverse().map((a) => (
              <div key={a.id} className="p-4">
                <p className="font-semibold">{dataBR(a.data, { day: "2-digit", month: "long", year: "numeric" })}</p>
                <p className="text-sm text-muted">
                  {a.peso_kg != null && `${a.peso_kg} kg`}
                  {a.gordura_pct != null && ` · ${a.gordura_pct}% de gordura`}
                </p>
                {a.observacao && <p className="mt-1 text-sm">{a.observacao}</p>}
              </div>
            ))}
          </Cartao>
        </>
      )}
    </>
  );
}
