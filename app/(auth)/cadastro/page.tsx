import Link from "next/link";
import { Enviar, Formulario } from "@/components/Formulario";
import { Rotulo } from "@/components/ui";
import { brl } from "@/lib/formato";
import { createClient } from "@/lib/supabase/server";
import type { Plano } from "@/lib/tipos";
import { cadastrar } from "../acoes";

export const metadata = { title: "Criar conta" };

export default async function Cadastro({ searchParams }: { searchParams: Promise<{ plano?: string; ref?: string }> }) {
  const { plano, ref } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("plans").select("*").in("tipo", ["presencial", "online"]).order("ordem");
  const planos = (data ?? []) as Plano[];

  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold">Quero começar</h1>
      <p className="mb-6 text-sm text-muted">Crie sua conta. Depois de confirmar o e-mail, você responde a anamnese e aceita o contrato.</p>
      <Formulario acao={cadastrar}>
        <Rotulo texto="Nome completo">
          <input className="campo" name="nome" autoComplete="name" required />
        </Rotulo>
        <Rotulo texto="E-mail">
          <input className="campo" name="email" type="email" autoComplete="email" required />
        </Rotulo>
        <Rotulo texto="WhatsApp com DDD">
          <input className="campo" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(47) 9 9999-9999" required />
        </Rotulo>
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto="Nascimento">
            <input className="campo" name="nascimento" type="date" required />
          </Rotulo>
          <Rotulo texto="Sexo">
            <select className="campo" name="sexo" required defaultValue="">
              <option value="" disabled>Escolha</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </Rotulo>
        </div>
        <Rotulo texto="Plano" dica="Pode mudar depois. O Jayson confirma o plano antes da primeira cobrança.">
          <select className="campo" name="plano_id" defaultValue={plano ?? ""}>
            <option value="">Ainda não sei / aula avulsa</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} · {brl(p.preco_centavos)}
                {p.meses > 1 ? ` (${p.meses} meses)` : "/mês"}
              </option>
            ))}
          </select>
        </Rotulo>
        <Rotulo texto="Vencimento da mensalidade">
          <select className="campo" name="dia_vencimento" defaultValue="10">
            <option value="5">Dia 5</option>
            <option value="10">Dia 10</option>
          </select>
        </Rotulo>
        <Rotulo texto="Como conheceu o Jayson?">
          <select className="campo" name="origem" defaultValue={ref ? "indicacao" : "instagram"}>
            <option value="instagram">Instagram</option>
            <option value="indicacao">Indicação de aluno</option>
            <option value="outro">Outro</option>
          </select>
        </Rotulo>
        {ref && <input type="hidden" name="indicacao" value={ref} />}
        <Rotulo texto="Senha" dica="Pelo menos 8 caracteres">
          <input className="campo" name="senha" type="password" autoComplete="new-password" minLength={8} required />
        </Rotulo>
        <Rotulo texto="Repita a senha">
          <input className="campo" name="senha2" type="password" autoComplete="new-password" minLength={8} required />
        </Rotulo>
        <Enviar className="w-full">Criar conta</Enviar>
      </Formulario>
      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta? <Link href="/entrar" className="font-semibold text-accent">Entrar</Link>
      </p>
    </>
  );
}
