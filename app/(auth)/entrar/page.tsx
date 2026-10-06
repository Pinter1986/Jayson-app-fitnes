import Link from "next/link";
import { Enviar, Formulario } from "@/components/Formulario";
import { Rotulo } from "@/components/ui";
import { entrar } from "../acoes";

export const metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold">Entrar</h1>
      {erro === "link" && (
        <p className="mb-4 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">O link expirou ou já foi usado. Entre com sua senha ou peça um novo link.</p>
      )}
      <Formulario acao={entrar}>
        <Rotulo texto="E-mail">
          <input className="campo" name="email" type="email" autoComplete="email" required />
        </Rotulo>
        <Rotulo texto="Senha">
          <input className="campo" name="senha" type="password" autoComplete="current-password" required />
        </Rotulo>
        <Enviar className="w-full">Entrar</Enviar>
      </Formulario>
      <div className="mt-6 space-y-3 text-center text-sm">
        <Link href="/esqueci-senha" className="block text-muted underline">Esqueci minha senha</Link>
        <p className="text-muted">
          Ainda não é aluno? <Link href="/cadastro" className="font-semibold text-accent">Quero começar</Link>
        </p>
      </div>
    </>
  );
}
