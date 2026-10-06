"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Mantém a sessão do Supabase renovada pelo navegador (o cliente renova o token
// sozinho e grava o cookie). Substitui o middleware, que falhava na Vercel.
// A proteção das telas continua no servidor: exigirAluno / exigirAdmin.
export default function SessaoSupabase() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().catch(() => {});
    const { data } = supabase.auth.onAuthStateChange(() => {});
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}
