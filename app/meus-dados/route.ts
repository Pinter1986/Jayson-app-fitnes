import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// LGPD: o aluno baixa tudo o que o app guarda sobre ele (o RLS garante que são só os dele)
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Faça login" }, { status: 401 });

  const tabelas = ["profiles", "subscriptions", "bookings", "invoices", "workouts", "workout_logs", "assessments", "anamnesis", "checkins", "consents"] as const;
  const dados: Record<string, unknown> = { gerado_em: new Date().toISOString(), email: user.email };
  for (const t of tabelas) {
    const { data } = await supabase.from(t).select("*").eq(t === "profiles" ? "id" : "aluno_id", user.id);
    dados[t] = data ?? [];
  }

  return new NextResponse(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-jayson-lucian.json"`,
    },
  });
}
