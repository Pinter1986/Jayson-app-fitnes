import { Enviar, Formulario } from "@/components/Formulario";
import { Rotulo } from "@/components/ui";
import { redefinirSenha } from "../acoes";

export const metadata = { title: "Nova senha" };

export default function RedefinirSenha() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold">Crie sua senha</h1>
      <Formulario acao={redefinirSenha}>
        <Rotulo texto="Nova senha" dica="Pelo menos 8 caracteres">
          <input className="campo" name="senha" type="password" autoComplete="new-password" minLength={8} required />
        </Rotulo>
        <Rotulo texto="Repita a senha">
          <input className="campo" name="senha2" type="password" autoComplete="new-password" minLength={8} required />
        </Rotulo>
        <Enviar className="w-full">Salvar senha</Enviar>
      </Formulario>
    </>
  );
}
