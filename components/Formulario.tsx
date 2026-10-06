"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export type Resultado = { erro?: string; ok?: string } | null;
type Acao = (anterior: Resultado, dados: FormData) => Promise<Resultado>;

// Formulário com Server Action: mostra erro ou confirmação embaixo do botão
export function Formulario({
  acao,
  children,
  className = "space-y-4",
  limparAoSalvar = false,
}: {
  acao: Acao;
  children: React.ReactNode;
  className?: string;
  limparAoSalvar?: boolean;
}) {
  const [estado, executar] = useActionState(acao, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado?.ok && limparAoSalvar) ref.current?.reset();
  }, [estado, limparAoSalvar]);

  return (
    <form ref={ref} action={executar} className={className}>
      {children}
      <Mensagem estado={estado} />
    </form>
  );
}

export function Mensagem({ estado }: { estado: Resultado }) {
  if (!estado) return null;
  if (estado.erro) return <p role="alert" className="rounded-xl bg-err/10 px-3 py-2 text-sm text-err">{estado.erro}</p>;
  if (estado.ok) return <p role="status" className="rounded-xl bg-ok/10 px-3 py-2 text-sm text-ok">{estado.ok}</p>;
  return null;
}

export function Enviar({
  children,
  variante = "primario",
  className = "",
  name,
  value,
}: {
  children: React.ReactNode;
  variante?: "primario" | "secundario" | "perigo";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} disabled={pending} className={`btn btn-${variante} ${className}`}>
      {pending ? "Aguarde…" : children}
    </button>
  );
}
