-- Fotos de avaliação em bucket privado: pasta = id do aluno. Acesso só por link temporário.
insert into storage.buckets (id, name, public) values ('avaliacoes', 'avaliacoes', false)
on conflict (id) do nothing;

create policy avaliacoes_admin on storage.objects for all to authenticated
  using (bucket_id = 'avaliacoes' and public.is_admin())
  with check (bucket_id = 'avaliacoes' and public.is_admin());

create policy avaliacoes_proprio_ler on storage.objects for select to authenticated
  using (bucket_id = 'avaliacoes' and (storage.foldername(name))[1] = auth.uid()::text);
