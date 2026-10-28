<script lang="ts">
  import { organizer } from '$lib/data/organizer.svelte';
  import type { ProjectItem } from '$lib/data/organizerTypes';
  import { money } from '$lib/core/money';
  import { dayMonth, today } from '$lib/core/dates';
  import Icon from '$lib/ui/Icon.svelte';
  import { hint } from '$lib/ui/hint';
  import { priorityColor } from '$lib/features/projects';

  /** Linha de item: marcar como feito, descrição, cômodo, prioridade e valor. */
  let { item, onedit, project = '' }: { item: ProjectItem; onedit: () => void; project?: string } = $props();
  const toggle = () => organizer.update('project_items', item.id, { done: !item.done, date: item.done ? null : item.date ?? today() });
  const detail = $derived([project, item.area, item.kind === 'service' ? 'Serviço' : 'Produto', item.done && item.date ? dayMonth(item.date) : '', item.vendor].filter(Boolean).join(' · '));
</script>

<div class="list-row">
  <button class="check" class:on={item.done} onclick={toggle} aria-label={item.done ? 'Desmarcar' : 'Marcar como feito'} use:hint={[item.done ? 'Feito' : 'Marcar como feito', item.done ? 'Toque para voltar para Planejado.' : 'Comprado ou concluído: vai para Feito com a data de hoje.']}>
    <Icon name={item.done ? 'check' : 'circle'} size={item.done ? 15 : 20} stroke={item.done ? 3 : 1.6} />
  </button>
  <button class="grow stack-sm plain" style="gap: 2px; min-width: 0" onclick={onedit}>
    <span class="ellipsis">{item.description}</span>
    <span class="caption ellipsis">{detail}</span>
  </button>
  {#if !item.done}<span class="prio" style:--c={priorityColor[item.priority]} use:hint={[`Prioridade ${item.priority}`, '1 = fazer primeiro, 5 = um dia.']}>{item.priority}</span>{/if}
  {#if item.link}<a class="icon-btn small" href={item.link} target="_blank" rel="noopener noreferrer" aria-label="Abrir link" use:hint={['Link', 'Abre a página do produto.']}><Icon name="external-link" size={15} /></a>{/if}
  <span class="num" class:faint={item.amount_cents === null}>{item.amount_cents === null ? '—' : money(item.amount_cents, { cents: item.amount_cents % 100 !== 0 })}</span>
</div>

<style>
  .check { width: 28px; height: 28px; border-radius: 50%; border: 0; display: grid; place-items: center; flex: none; background: none; color: var(--text-3); }
  .check.on { background: var(--accent); color: #04140e; }
  .plain { background: none; border: 0; text-align: left; padding: 0; color: inherit; }
  .prio { width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; font-size: 12px; font-weight: 800; flex: none; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
  .icon-btn.small { width: 30px; height: 30px; }
</style>
