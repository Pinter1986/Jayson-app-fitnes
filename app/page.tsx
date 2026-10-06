import Link from "next/link";
import { brl } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { Ajustes, Plano } from "@/lib/tipos";

const PASSOS = [
  { t: "Crie sua conta", d: "Escolha o plano e cadastre-se com e-mail e senha." },
  { t: "Anamnese e avaliação", d: "Responda a anamnese no app e marque sua avaliação." },
  { t: "Treino no app", d: "Agenda, treino com vídeos, registro de carga e evolução, tudo no celular." },
];

const FAQ = [
  { p: "Tem fidelidade?", r: "Não. Para cancelar, é só avisar com 30 dias de antecedência pelo app." },
  { p: "E se eu precisar faltar?", r: "Cancele até 24 horas antes e a aula volta para o seu saldo. Falta sem aviso conta como aula dada." },
  { p: "Onde são as aulas?", r: "Nas academias Uplay, Premium e Fitway, ou online pela consultoria." },
  { p: "Como pago?", r: "PIX ou cartão de débito e crédito. A mensalidade vence no dia 5 ou 10, você escolhe." },
];

export default async function PaginaVendas() {
  const supabase = await createClient();
  const [{ data: planos }, { data: ajustes }, { data: usuario }] = await Promise.all([
    supabase.from("plans").select("*").eq("ativo", true).order("ordem"),
    supabase.from("settings").select("textos").eq("id", 1).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  const textos = (ajustes?.textos ?? {}) as Ajustes["textos"];
  const lista = (planos ?? []) as Plano[];
  const logado = !!usuario?.user;

  return (
    <main className="mx-auto max-w-3xl px-5">
      <header className="flex items-center justify-between py-5">
        <p className="font-titulo text-lg font-extrabold">Jayson <span className="italic text-accent">Lucian</span></p>
        <Link href={logado ? "/inicio" : "/entrar"} className="btn btn-secundario px-4 py-2 text-sm">{logado ? "Abrir app" : "Entrar"}</Link>
      </header>

      <section className="py-14 text-center">
        <p className="mb-3 text-sm uppercase tracking-[0.2em] text-muted">Personal Trainer · Time Boribilda</p>
        <h1 className="text-5xl font-extrabold leading-none sm:text-6xl">{textos.vendas_titulo || "Quer evoluir?"}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          {textos.vendas_bio || "Treinador há mais de 12 anos, especializado em biomecânica e bodybuilder coach."}
        </p>
        <p className="mt-1 text-sm text-muted">CREF 018556-G/SC · @personal_jaysonlucian</p>
        <Link href="/cadastro" className="btn btn-primario mt-8 px-8 py-4 text-lg">Quero começar</Link>
      </section>

      <section className="py-8">
        <h2 className="mb-5 text-2xl font-extrabold">Planos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {lista.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-borda bg-surface p-5">
              <p className="font-titulo text-lg font-extrabold">{p.nome}</p>
              {p.descricao && <p className="mt-1 text-sm text-muted">{p.descricao}</p>}
              <p className="mt-4 font-titulo text-3xl font-extrabold">
                {brl(p.preco_centavos)}
                <span className="text-sm font-semibold text-muted">
                  {p.tipo === "presencial" || (p.tipo === "online" && p.meses === 1) ? "/mês" : p.meses > 1 ? ` por ${p.meses} meses` : ""}
                </span>
              </p>
              {(p.tipo === "presencial" || p.tipo === "online") && (
                <Link href={`/cadastro?plano=${p.id}`} className="btn btn-secundario mt-4">Escolher</Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="py-8">
        <h2 className="mb-5 text-2xl font-extrabold">Como funciona</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {PASSOS.map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-borda bg-surface p-5">
              <p className="font-titulo text-3xl font-extrabold text-accent">{i + 1}</p>
              <p className="mt-2 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="py-8">
        <h2 className="mb-5 text-2xl font-extrabold">Perguntas frequentes</h2>
        <div className="space-y-2">
          {FAQ.map((f) => (
            <details key={f.p} className="rounded-2xl border border-borda bg-surface p-4">
              <summary className="cursor-pointer font-semibold">{f.p}</summary>
              <p className="mt-2 text-sm text-muted">{f.r}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="py-14 text-center">
        <h2 className="text-3xl font-extrabold">Treino sério, clima leve.</h2>
        <Link href="/cadastro" className="btn btn-primario mt-6 px-8 py-4 text-lg">Quero começar</Link>
      </section>

      <footer className="border-t border-borda py-6 text-center text-xs text-muted">Jayson Lucian · Personal Trainer · CREF 018556-G/SC</footer>
    </main>
  );
}
