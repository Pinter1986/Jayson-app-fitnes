"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/inicio", rotulo: "Início", icone: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" },
  { href: "/agenda", rotulo: "Agenda", icone: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4" },
  { href: "/treino", rotulo: "Treino", icone: "M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" },
  { href: "/evolucao", rotulo: "Evolução", icone: "M4 19h16M5 15l4-4 4 3 6-7" },
  { href: "/financeiro", rotulo: "Financeiro", icone: "M3 6h18v12H3zM3 10h18M7 15h3" },
];

export default function NavAluno() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-borda bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {ABAS.map((a) => {
          const ativo = path === a.href || path.startsWith(a.href + "/");
          return (
            <li key={a.href}>
              <Link href={a.href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${ativo ? "text-accent" : "text-muted"}`}>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={a.icone} />
                </svg>
                {a.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
