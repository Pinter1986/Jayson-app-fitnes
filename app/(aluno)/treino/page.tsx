import { LinkLinha, Titulo, Vazio, Cartao } from "@/components/ui";
import { dataBR } from "@/lib/formato";
import { exigirAluno } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { Treino } from "@/lib/tipos";

export const metadata = { title: "Treino" };

export default async function Treinos() {
  await exigirAluno();
  const supabase = await createClient();
  const { data } = await supabase.from("workouts").select("*").eq("ativo", true).order("ordem");
  const treinos = (data ?? []) as Treino[];

  return (
    <>
      <Titulo sub={treinos[0] ? `Publicado em ${dataBR(treinos[0].publicado_em)}` : undefined}>Treino</Titulo>
      {treinos.length ? (
        <Cartao className="py-1">
          {treinos.map((t) => (
            <LinkLinha key={t.id} href={`/treino/${t.id}`}>
              <p className="font-titulo text-lg font-extrabold">{t.nome}</p>
              {t.observacao && <p className="truncate text-sm text-muted">{t.observacao}</p>}
            </LinkLinha>
          ))}
        </Cartao>
      ) : (
        <Vazio>O Jayson ainda está montando seu treino.</Vazio>
      )}
    </>
  );
}
