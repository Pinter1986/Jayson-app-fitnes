import Link from "next/link";
import { Cartao, Selo, Subtitulo } from "@/components/ui";
import { situacao } from "@/lib/dinheiro";
import { brl, dataBR, diaLocal, diaSemanaBR, horaBR, linkWhatsApp } from "@/lib/formato";
import { ajustesAtuais, exigirAluno } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import type { Assinatura, Cobranca, Reserva, Treino } from "@/lib/tipos";

export const metadata = { title: "Início" };

export default async function Inicio() {
  const perfil = await exigirAluno();
  const ajustes = await ajustesAtuais();
  const supabase = await createClient();

  const [{ data: proxima }, { data: treinos }, { data: cobrancas }, { data: assinatura }, { data: saldo }] = await Promise.all([
    supabase.from("bookings").select("*, gyms(nome)").eq("status", "marcada").gte("inicio", new Date().toISOString()).order("inicio").limit(1).maybeSingle(),
    supabase.from("workouts").select("*").eq("ativo", true).order("ordem"),
    supabase.from("invoices").select("*").neq("status", "cancelada").order("vencimento", { ascending: false }).limit(6),
    supabase.from("subscriptions").select("*, plans(*)").neq("status", "encerrada").maybeSingle(),
    supabase.rpc("saldo_aulas", { p_aluno: perfil.id }),
  ]);

  const reserva = proxima as Reserva | null;
  const listaTreinos = (treinos ?? []) as Treino[];
  const abertas = ((cobrancas ?? []) as Cobranca[]).filter((c) => c.status === "aberta");
  const plano = assinatura as Assinatura | null;
  const hoje = diaLocal();

  return (
    <>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{dataBR(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-2xl font-extrabold">Bora, {perfil.nome.split(" ")[0]}!</h1>
        </div>
        <Link href="/perfil" aria-label="Perfil" className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 font-titulo font-extrabold">
          {perfil.nome.slice(0, 1).toUpperCase()}
        </Link>
      </header>

      {plano?.status === "pendente" && (
        <Cartao className="mb-3 border-warn/40">
          <p className="text-sm"><b>Plano aguardando confirmação.</b> O Jayson confirma seu plano e o vencimento em breve. Até lá, você pode marcar aula avulsa.</p>
        </Cartao>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Cartao className="col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted">Próxima aula</p>
          {reserva ? (
            <>
              <p className="mt-1 font-titulo text-2xl font-extrabold capitalize">
                {diaSemanaBR(reserva.inicio, "long")}, {horaBR(reserva.inicio)}
              </p>
              <p className="text-sm text-muted">{dataBR(reserva.inicio, { day: "2-digit", month: "long" })} · {reserva.gyms?.nome}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Nenhuma aula marcada.</p>
          )}
          <Link href="/agenda" className="btn btn-primario mt-3 w-full">{reserva ? "Ver agenda" : "Marcar aula"}</Link>
        </Cartao>

        <Cartao>
          <p className="text-xs text-muted">Aulas no mês</p>
          <p className="mt-1 font-titulo text-2xl font-extrabold">{saldo == null ? "—" : saldo}</p>
          <p className="text-xs text-muted">{saldo == null ? "sem plano presencial" : "restantes"}</p>
        </Cartao>

        <Cartao>
          <p className="text-xs text-muted">Mensalidade</p>
          {abertas.length ? (
            <>
              <p className="mt-1 font-titulo text-lg font-extrabold">{brl(abertas[abertas.length - 1].valor_centavos)}</p>
              <Selo tom={situacao(abertas[abertas.length - 1], hoje).tom}>
                {situacao(abertas[abertas.length - 1], hoje).texto} · {dataBR(abertas[abertas.length - 1].vencimento, { day: "2-digit", month: "2-digit" })}
              </Selo>
            </>
          ) : (
            <>
              <p className="mt-1 font-titulo text-lg font-extrabold">Em dia</p>
              <Selo tom="ok">Nada em aberto</Selo>
            </>
          )}
        </Cartao>
      </div>

      <Subtitulo>Treino</Subtitulo>
      {listaTreinos.length ? (
        <div className="grid grid-cols-3 gap-2">
          {listaTreinos.map((t) => (
            <Link key={t.id} href={`/treino/${t.id}`} className="rounded-2xl border border-borda bg-surface p-3 text-center font-titulo font-extrabold">
              {t.nome}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">O Jayson ainda está montando seu treino.</p>
      )}

      {ajustes.combinados && (
        <>
          <Subtitulo>Combinados</Subtitulo>
          <Cartao>
            <p className="whitespace-pre-line text-sm">{ajustes.combinados}</p>
          </Cartao>
        </>
      )}

      <a href={linkWhatsApp(ajustes.whatsapp, `Oi Jayson, aqui é ${perfil.nome}.`)} target="_blank" rel="noreferrer" className="btn btn-secundario mt-6 w-full">
        Falar com o Jayson no WhatsApp
      </a>
    </>
  );
}
