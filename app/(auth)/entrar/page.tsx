import Link from "next/link";
import FormEntrar from "./FormEntrar";

export const metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <>
      <h1 className="mb-6 text-3xl font-extrabold">Entrar</h1>
      {erro === "link" && (
        <p className="mb-4 rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">O link expirou ou já foi usado. Entre com sua senha ou peça um novo link.</p>
      )}
      <FormEntrar />
      <div className="mt-6 space-y-3 text-center text-sm">
        <Link href="/esqueci-senha" className="block text-muted underline">Esqueci minha senha</Link>
        <p className="text-muted">
          Ainda não é aluno? <Link href="/cadastro" className="font-semibold text-accent">Quero começar</Link>
        </p>
      </div>
    </>
  );
}
