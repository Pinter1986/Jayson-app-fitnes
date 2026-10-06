"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Resultado } from "@/components/Formulario";
import { createClient } from "@/lib/supabase/server";

async function origem() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

function traduz(msg: string) {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem cadastro. Use \"Entrar\" ou \"Esqueci minha senha\".";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/rate limit|security purposes/i.test(msg)) return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (/sending (confirmation|recovery|magic link)? ?email|smtp/i.test(msg))
    return "Não foi possível enviar o e-mail de confirmação. Avise o Jayson para liberar seu acesso.";
  console.error("auth", msg);
  return `Não deu certo agora. Tente de novo em instantes. (detalhe: ${msg})`;
}

const texto = (d: FormData, campo: string) => String(d.get(campo) ?? "").trim();

export async function entrar(_: Resultado, dados: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: texto(dados, "email").toLowerCase(),
    password: String(dados.get("senha") ?? ""),
  });
  if (error) return { erro: traduz(error.message) };
  const { data: perfil } = await supabase.from("profiles").select("papel").eq("id", data.user.id).single();
  redirect(perfil?.papel === "admin" ? "/admin" : "/inicio");
}

export async function cadastrar(_: Resultado, dados: FormData): Promise<Resultado> {
  const senha = String(dados.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== String(dados.get("senha2") ?? "")) return { erro: "As senhas não conferem." };
  const whatsapp = texto(dados, "whatsapp").replace(/\D/g, "");
  if (whatsapp.length < 10) return { erro: "Informe o WhatsApp com DDD." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: texto(dados, "email").toLowerCase(),
    password: senha,
    options: {
      emailRedirectTo: `${await origem()}/auth/callback?next=/primeiro-acesso`,
      data: {
        nome: texto(dados, "nome"),
        whatsapp,
        nascimento: texto(dados, "nascimento"),
        sexo: texto(dados, "sexo"),
        origem: texto(dados, "origem") || undefined,
        plano_id: texto(dados, "plano_id") || undefined,
        dia_vencimento: texto(dados, "dia_vencimento") || "10",
        indicacao: texto(dados, "indicacao") || undefined,
      },
    },
  });
  if (error) return { erro: traduz(error.message) };
  return { ok: "Conta criada! Enviamos um link de confirmação para o seu e-mail. Abra o link para entrar." };
}

export async function esqueciSenha(_: Resultado, dados: FormData): Promise<Resultado> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(texto(dados, "email").toLowerCase(), {
    redirectTo: `${await origem()}/auth/callback?next=/redefinir-senha`,
  });
  if (error) return { erro: traduz(error.message) };
  return { ok: "Se o e-mail tiver cadastro, você vai receber um link para criar uma nova senha." };
}

export async function redefinirSenha(_: Resultado, dados: FormData): Promise<Resultado> {
  const senha = String(dados.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== String(dados.get("senha2") ?? "")) return { erro: "As senhas não conferem." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: traduz(error.message) };
  redirect("/inicio");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
