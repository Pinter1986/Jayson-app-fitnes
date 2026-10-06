import { Titulo } from "@/components/ui";
import { brl, diaLocal, somaDias } from "@/lib/formato";
import { ajustesAtuais, exigirAluno } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { Academia, Plano, Reserva } from "@/lib/tipos";
import AgendaAluno from "./AgendaAluno";

export const metadata = { title: "Agenda" };

export default async function Agenda() {
  const perfil = await exigirAluno();
  const ajustes = await ajustesAtuais();
  const supabase = await createClient();
  const hoje = diaLocal();

  const [{ data: livres }, { data: academias }, { data: minhas }, { data: saldo }, { data: avulsos }] = await Promise.all([
    supabase.rpc("horarios_livres", { p_de: hoje, p_ate: somaDias(hoje, ajustes.abertura_dias) }),
    supabase.from("gyms").select("*").order("ordem"),
    supabase.from("bookings").select("*, gyms(nome)").eq("status", "marcada").gte("inicio", new Date(Date.now() - 3600_000).toISOString()).order("inicio"),
    supabase.rpc("saldo_aulas", { p_aluno: perfil.id }),
    supabase.from("plans").select("*").in("tipo", ["avulsa", "dupla"]).order("ordem"),
  ]);

  const precos = (avulsos ?? []) as Plano[];
  const avulsa = precos.find((p) => p.tipo === "avulsa");
  const dupla = precos.find((p) => p.tipo === "dupla");

  return (
    <>
      <Titulo sub={saldo == null ? `Sem plano presencial: cada aula é avulsa (${brl(avulsa?.preco_centavos)}).` : `Você tem ${saldo} aula(s) no saldo deste mês.`}>
        Agenda
      </Titulo>
      <AgendaAluno
        livres={(livres ?? []) as { inicio: string; vagas: number; academia_id: string | null }[]}
        academias={((academias ?? []) as Academia[]).filter((a) => a.nome.toLowerCase() !== "online")}
        minhas={(minhas ?? []) as Reserva[]}
        cancelamentoHoras={ajustes.cancelamento_horas}
        precoDupla={dupla ? brl(dupla.preco_centavos) : null}
      />
    </>
  );
}
