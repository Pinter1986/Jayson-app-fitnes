import Link from "next/link";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <Link href="/" className="mb-8 font-titulo text-xl font-extrabold">
        Jayson <span className="italic text-accent">Lucian</span>
      </Link>
      {children}
    </main>
  );
}
