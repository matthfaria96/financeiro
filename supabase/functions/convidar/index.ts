// Convidar familiar: cria o acesso (e-mail + senha provisória) e põe a pessoa na casa ou no espaço compartilhado.
// Roda no servidor do Supabase porque criar usuário exige a chave service_role, que nunca vai para o navegador.
// Só quem já é membro da casa/espaço pode convidar para ela; no máximo 8 pessoas por casa/espaço.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function tempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `Fin-${hex.slice(0, 6)}-${hex.slice(6, 12)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'método não permitido' });
  const url = Deno.env.get('SUPABASE_URL')!;
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: auth } = await caller.auth.getUser();
  if (!auth.user) return reply(401, { error: 'faça login de novo' });

  let body: { email?: string; name?: string; householdId?: string };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'pedido inválido' });
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const name = (body.name ?? '').trim().slice(0, 60);
  const householdId = body.householdId ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return reply(400, { error: 'e-mail inválido' });
  if (!/^[0-9a-f-]{36}$/.test(householdId)) return reply(400, { error: 'casa inválida' });

  // Quem convida precisa ser da casa/espaço (a consulta passa pelas regras de acesso do próprio usuário).
  const { data: member } = await caller.from('household_members').select('household_id').eq('household_id', householdId).eq('user_id', auth.user.id).maybeSingle();
  if (!member) return reply(403, { error: 'sem acesso a esta casa' });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { count } = await admin.from('household_members').select('user_id', { count: 'exact', head: true }).eq('household_id', householdId);
  if ((count ?? 0) >= 8) return reply(400, { error: 'limite de 8 pessoas por casa' });

  // Já tem acesso? Só entra na casa. Senão, cria com senha provisória (trocada no primeiro acesso).
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let userId = users?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
  let password: string | null = null;
  if (!userId) {
    password = tempPassword();
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true, name } });
    if (error || !data.user) return reply(400, { error: 'não consegui criar o acesso' });
    userId = data.user.id;
  }
  const { error: joinError } = await admin.from('household_members').upsert({ household_id: householdId, user_id: userId, display_name: name }, { onConflict: 'household_id,user_id', ignoreDuplicates: true });
  if (joinError) return reply(400, { error: 'não consegui adicionar à casa' });

  // Convidado só para o espaço compartilhado ganha a própria casa (o financeiro dele, vazio e só dele).
  const { data: space } = await admin.from('households').select('kind').eq('id', householdId).single();
  if (space?.kind === 'shared') {
    const { data: mine } = await admin.from('household_members').select('household_id, households!inner(kind)').eq('user_id', userId).eq('households.kind', 'personal');
    if (!mine?.length) {
      const { data: house } = await admin.from('households').insert({ name: 'Minha casa' }).select('id').single();
      if (house) await admin.from('household_members').insert({ household_id: house.id, user_id: userId, display_name: name });
    }
  }
  return reply(200, { created: password !== null, password });
});
