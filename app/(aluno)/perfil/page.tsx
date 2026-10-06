import Link from "next/link";
import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, Rotulo, Subtitulo, Titulo } from "@/components/ui";
import { linkWhatsApp } from "@/lib/formato";
import { ajustesAtuais, exigirAluno } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import { sair } from "../../(auth)/acoes";
import { pedirCancelamento, salvarPerfil, trocarTema } from "../acoes";
import { cookies } from "next/headers";

export const metadata = { title: "Perfil" };

export default async function Perfil() {
  const perfil = await exigirAluno();
  const ajustes = await ajustesAtuais();
  const supabase = await createClient();
  const { data: assinatura } = await supabase.from("subscriptions").select("status").neq("status", "encerrada").maybeSingle();
  const claro = (await cookies()).get("tema")?.value === "claro";

  return (
    <>
      <Titulo sub={perfil.email}>Perfil</Titulo>

      <Cartao>
        <Formulario acao={salvarPerfil}>
          <Rotulo texto="Nome">
            <input className="campo" name="nome" defaultValue={perfil.nome} required />
          </Rotulo>
          <Rotulo texto="WhatsApp">
            <input className="campo" name="whatsapp" type="tel" defaultValue={perfil.whatsapp ?? ""} />
          </Rotulo>
          <Rotulo texto="Nascimento">
            <input className="campo" name="nascimento" type="date" defaultValue={perfil.nascimento ?? ""} />
          </Rotulo>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Quero receber avisos por</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="avisos_email" defaultChecked={perfil.avisos_email} /> E-mail</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="avisos_whatsapp" defaultChecked={perfil.avisos_whatsapp} /> WhatsApp</label>
          </fieldset>
          <Enviar className="w-full">Salvar</Enviar>
        </Formulario>
      </Cartao>

      <Subtitulo>Conta</Subtitulo>
      <Cartao className="space-y-2">
        <Link href="/redefinir-senha" className="btn btn-secundario w-full">Trocar senha</Link>
        <form action={trocarTema}>
          <button className="btn btn-secundario w-full">{claro ? "Usar tema escuro" : "Usar tema claro"}</button>
        </form>
        <a href="/meus-dados" className="btn btn-secundario w-full" download>Baixar meus dados</a>
        <a
          className="btn btn-secundario w-full"
          target="_blank"
          rel="noreferrer"
          href={linkWhatsApp(ajustes.whatsapp, `Oi Jayson, aqui é ${perfil.nome} (${perfil.email}). Quero pedir a exclusão da minha conta e dos meus dados do app.`)}
        >
          Pedir exclusão da conta
        </a>
      </Cartao>

      {assinatura?.status === "ativa" && (
        <>
          <Subtitulo>Plano</Subtitulo>
          <Cartao>
            <p className="mb-3 text-sm text-muted">Sem fidelidade. O cancelamento tem aviso de 30 dias: seu plano segue ativo até lá.</p>
            <Formulario acao={pedirCancelamento}>
              <Enviar variante="perigo" className="w-full">Pedir cancelamento do plano</Enviar>
            </Formulario>
          </Cartao>
        </>
      )}

      <form action={sair} className="mt-6">
        <button className="btn btn-secundario w-full">Sair</button>
      </form>
    </>
  );
}
