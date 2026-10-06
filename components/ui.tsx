import Link from "next/link";

export function Cartao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-borda bg-surface p-4 ${className}`}>{children}</section>;
}

export function Titulo({ children, sub, acao }: { children: React.ReactNode; sub?: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold leading-tight">{children}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {acao}
    </header>
  );
}

export function Subtitulo({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {acao}
    </div>
  );
}

const TONS = {
  ok: "bg-ok/15 text-ok",
  aviso: "bg-warn/15 text-warn",
  erro: "bg-err/15 text-err",
  neutro: "bg-surface-2 text-muted",
  marca: "bg-accent/15 text-accent",
} as const;

export type Tom = keyof typeof TONS;

export function Selo({ children, tom = "neutro" }: { children: React.ReactNode; tom?: Tom }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONS[tom]}`}>{children}</span>;
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-borda p-6 text-center text-sm text-muted">{children}</p>;
}

export function Rotulo({ texto, children, dica }: { texto: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{texto}</span>
      {children}
      {dica && <span className="block text-xs text-muted">{dica}</span>}
    </label>
  );
}

export function Numero({ rotulo, valor, tom }: { rotulo: string; valor: React.ReactNode; tom?: Tom }) {
  return (
    <div className="rounded-2xl border border-borda bg-surface p-3">
      <p className="text-xs text-muted">{rotulo}</p>
      <p className={`mt-1 font-titulo text-xl font-extrabold ${tom === "erro" ? "text-err" : tom === "ok" ? "text-ok" : ""}`}>{valor}</p>
    </div>
  );
}

export function LinkLinha({ href, children, direita }: { href: string; children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 border-b border-borda py-3 last:border-0">
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 items-center gap-2 text-muted">
        {direita}
        <span aria-hidden>›</span>
      </div>
    </Link>
  );
}

export function Voltar({ href, children = "Voltar" }: { href: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-block text-sm text-muted">
      ‹ {children}
    </Link>
  );
}
