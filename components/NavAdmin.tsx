"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/admin", rotulo: "Painel", icone: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z" },
  { href: "/admin/agenda", rotulo: "Agenda", icone: "M4 5h16v15H4zM4 9h16M8 3v4M16 3v4" },
  { href: "/admin/alunos", rotulo: "Alunos", icone: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6" },
  { href: "/admin/treinos", rotulo: "Treinos", icone: "M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" },
  { href: "/admin/financeiro", rotulo: "Financeiro", icone: "M3 6h18v12H3zM3 10h18M7 15h3" },
];

export default function NavAdmin() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-borda bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {ABAS.map((a) => {
          const ativo = a.href === "/admin" ? path === "/admin" : path.startsWith(a.href);
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
