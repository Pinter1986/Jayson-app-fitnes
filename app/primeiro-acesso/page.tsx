import { redirect } from "next/navigation";
import { Enviar, Formulario } from "@/components/Formulario";
import { Cartao, Rotulo } from "@/components/ui";
import { PARQ, PERGUNTAS } from "@/lib/anamnese";
import { aceitesEmDia, ajustesAtuais, perfilAtual } from "@/lib/sessao";
import { createClient } from "@/lib/supabase/server";
import { concluirPrimeiroAcesso } from "./acoes";

export const metadata = { title: "Primeiro acesso" };

function TextoLegal({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <details className="rounded-xl border border-borda bg-surface-2 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Ler: {titulo}</summary>
      <p className="mt-2 whitespace-pre-line text-muted">{texto ?? "Texto ainda não cadastrado."}</p>
    </details>
  );
}

export default async function PrimeiroAcesso() {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/entrar");
  if (perfil.papel === "admin") redirect("/admin");
  if (await aceitesEmDia(perfil.id)) redirect("/inicio");

  const ajustes = await ajustesAtuais();
  const supabase = await createClient();
  const { data: anterior } = await supabase.from("anamnesis").select("respostas").eq("aluno_id", perfil.id).maybeSingle();
  const resp = (anterior?.respostas ?? {}) as Record<string, string>;
  const t = ajustes.textos ?? {};

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <h1 className="text-3xl font-extrabold">Olá, {perfil.nome.split(" ")[0]}!</h1>
      <p className="mb-6 mt-2 text-sm text-muted">
        {anterior ? "Os termos foram atualizados. Confira e aceite para continuar." : "Antes do primeiro treino, responda a anamnese e aceite os termos. Leva uns 3 minutos."}
      </p>

      <Formulario acao={concluirPrimeiroAcesso} className="space-y-6">
        <Cartao className="space-y-4">
          <h2 className="text-lg font-extrabold">PAR-Q</h2>
          <p className="text-sm text-muted">Questionário de prontidão para atividade física.</p>
          {PARQ.map((pergunta, i) => (
            <fieldset key={i} className="space-y-2">
              <legend className="text-sm">{i + 1}. {pergunta}</legend>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="radio" name={`parq_${i}`} value="nao" required /> Não</label>
                <label className="flex items-center gap-2"><input type="radio" name={`parq_${i}`} value="sim" /> Sim</label>
              </div>
            </fieldset>
          ))}
        </Cartao>

        <Cartao className="space-y-4">
          <h2 className="text-lg font-extrabold">Anamnese</h2>
          {PERGUNTAS.map((p) => (
            <Rotulo key={p.id} texto={p.rotulo}>
              <textarea className="campo" name={p.id} rows={2} defaultValue={resp[p.id] ?? ""} />
            </Rotulo>
          ))}
        </Cartao>

        <Cartao className="space-y-4">
          <h2 className="text-lg font-extrabold">Contrato e termos</h2>
          <TextoLegal titulo="Contrato de prestação de serviço" texto={t.contrato?.texto} />
          <TextoLegal titulo="Termos de uso e política de privacidade" texto={t.termos_privacidade?.texto} />
          <TextoLegal titulo="Termo de responsabilidade" texto={t.responsabilidade?.texto} />
          <label className="flex gap-3 text-sm"><input type="checkbox" name="aceite_contrato" required /> Li e aceito o contrato de prestação de serviço.</label>
          <label className="flex gap-3 text-sm"><input type="checkbox" name="aceite_termos_privacidade" required /> Li e aceito os termos de uso e a política de privacidade.</label>
          <label className="flex gap-3 text-sm"><input type="checkbox" name="aceite_responsabilidade" required /> Declaro que respondi o PAR-Q com verdade e aceito o termo de responsabilidade.</label>
        </Cartao>

        <Cartao className="space-y-4">
          <h2 className="text-lg font-extrabold">Fotos</h2>
          <TextoLegal titulo="Fotos para acompanhamento" texto={t.fotos_acompanhamento?.texto} />
          <label className="flex gap-3 text-sm"><input type="checkbox" name="aceite_fotos" defaultChecked /> Autorizo fotos nas avaliações, vistas só por mim e pelo Jayson.</label>
          <TextoLegal titulo="Divulgação (opcional)" texto={t.divulgacao?.texto} />
          <Rotulo texto="Uso das fotos de antes e depois na divulgação">
            <select className="campo" name="divulgacao" defaultValue="nao">
              <option value="nao">Não autorizo</option>
              <option value="sem_rosto">Autorizo sem rosto e sem nome</option>
              <option value="autorizo">Autorizo</option>
            </select>
          </Rotulo>
        </Cartao>

        <Enviar className="w-full">Concluir e entrar</Enviar>
      </Formulario>
    </main>
  );
}
