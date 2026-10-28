<script lang="ts">
  import Icon from './Icon.svelte';
  import { bankGradient, bankInk, kindIcon } from './look';
  import { bankInfo } from '$lib/core/banks';
  import type { Account } from '$lib/data/types';
  /** Miniatura de cartão nas cores do banco (desenho próprio, sem logotipos). */
  let { account, width = 84 }: { account: Pick<Account, 'bank' | 'kind' | 'color' | 'name' | 'last_digits'>; width?: number } = $props();
  const colors = $derived(bankGradient(account));
  const style = $derived(bankInk(account));
  const label = $derived(account.kind === 'cash' ? 'Dinheiro' : bankInfo(account.bank).label || account.name);
</script>

<span class="bank" style:width="{width}px" style:height="{width * 0.63}px" style:padding="{width * 0.08}px" style:border-radius="{width * 0.09}px"
  style:background="linear-gradient(135deg, {colors[0]}, {colors[1]})" style:box-shadow="inset 0 0 0 0.5px rgba(255,255,255,0.16), 0 4px 14px {colors[0]}55" style:color={style.ink} aria-hidden="true">
  <span class="shine" style:background={style.accent}></span>
  <span class="name" style:font-size="{width * 0.13}px">{label}</span>
  {#if account.kind === 'creditCard' && width >= 70}<span class="emv" style:width="{width * 0.15}px" style:height="{width * 0.11}px" style:border-radius="{width * 0.025}px"></span>{/if}
  <span class="foot">
    <span style:font-size="{width * 0.085}px">{account.last_digits ? `•••• ${account.last_digits}` : ''}</span>
    <Icon name={kindIcon[account.kind]} size={width * 0.15} stroke={2.2} />
  </span>
</span>

<style>
  .bank { position: relative; flex: none; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; line-height: 1; }
  .shine { position: absolute; width: 90%; aspect-ratio: 1; border-radius: 50%; right: -40%; top: -45%; }
  .name { position: relative; font-weight: 800; letter-spacing: -0.02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .emv { position: relative; background: linear-gradient(135deg, #F3D98B, #C9A24A); box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.25); opacity: 0.9; }
  .foot { position: relative; display: flex; justify-content: space-between; align-items: center; opacity: 0.9; }
</style>
