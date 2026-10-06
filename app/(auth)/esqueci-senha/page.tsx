import Link from "next/link";
import { Enviar, Formulario } from "@/components/Formulario";
import { Rotulo } from "@/components/ui";
import { esqueciSenha } from "../acoes";

export const metadata = { title: "Esqueci minha senha" };

export default function EsqueciSenha() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-extrabold">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-muted">
        Informe seu e-mail e enviamos um link para você criar uma senha nova. Também serve para o primeiro acesso de quem foi cadastrado pelo Jayson.
      </p>
      <Formulario acao={esqueciSenha}>
        <Rotulo texto="E-mail">
          <input className="campo" name="email" type="email" autoComplete="email" required />
        </Rotulo>
        <Enviar className="w-full">Enviar link</Enviar>
      </Formulario>
      <Link href="/entrar" className="mt-6 block text-center text-sm text-muted underline">Voltar para entrar</Link>
    </>
  );
}
