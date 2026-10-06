import NavAdmin from "@/components/NavAdmin";
import { exigirAdmin } from "@/lib/sessao";

export const metadata = { title: { default: "Gestão", template: "%s · Gestão" } };

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return (
    <>
      <main className="pb-nav mx-auto max-w-3xl px-4 pt-6">{children}</main>
      <NavAdmin />
    </>
  );
}
