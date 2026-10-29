import { store } from '$lib/data/store.svelte';

/** Quem está usando: nome (do acesso, ou da pessoa "Eu", ou do e-mail) e a foto da pessoa "Eu". */
export function profileName(): string {
  const member = store.members.find((m) => m.user_id === store.userId)?.display_name?.trim();
  if (member && member !== 'Você') return member;
  const me = store.people.find((p) => p.role === 'me')?.name?.trim();
  if (me && me.toLowerCase() !== 'eu') return me;
  if (store.demo) return 'Você';
  const local = store.userEmail.split('@')[0]?.split(/[._-]/)[0] ?? '';
  return local ? local[0].toUpperCase() + local.slice(1) : 'Você';
}

export const profilePhoto = () => store.people.find((p) => p.role === 'me')?.photo ?? '';
