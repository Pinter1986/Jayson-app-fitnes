import NavAluno from "@/components/NavAluno";
import { exigirAluno } from "@/lib/sessao";

export default async function LayoutAluno({ children }: { children: React.ReactNode }) {
  await exigirAluno();
  return (
    <>
      <main className="pb-nav mx-auto max-w-md px-4 pt-6">{children}</main>
      <NavAluno />
    </>
  );
}
