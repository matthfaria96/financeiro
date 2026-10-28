<script lang="ts">
  import Icon from './Icon.svelte';
  import { initials } from './look';
  import type { Category, Merchant } from '$lib/data/types';
  import { UNCATEGORIZED } from '$lib/core/catalog';
  import { colorFor } from '$lib/features/rules';

  /** Estabelecimento em destaque (logo, foto, emoji ou iniciais) com o ícone da subcategoria no canto;
   *  sem estabelecimento, o ícone da categoria é o avatar. */
  let { merchant = null, category = null, name = '', size = 44 }: { merchant?: Pick<Merchant, 'name' | 'emoji' | 'color' | 'image_url' | 'image_data' | 'is_logo'> | null; category?: Category | null; name?: string; size?: number } = $props();
  let broken = $state(false);
  const image = $derived(merchant && !broken ? merchant.image_data || merchant.image_url : '');
</script>

<span class="avatar" style:width="{size}px" style:height="{size}px" aria-hidden="true">
  {#if merchant}
    <span class="main" class:logo={merchant.is_logo && image} style:background={image ? (merchant.is_logo ? '#fff' : 'transparent') : merchant.color}>
      {#if image}
        <img src={image} alt="" loading="lazy" decoding="async" onerror={() => (broken = true)} style:padding={merchant.is_logo ? `${size * 0.15}px` : '0'} />
      {:else if merchant.emoji}
        <span style:font-size="{size * 0.5}px">{merchant.emoji}</span>
      {:else}
        <span class="ini" style:font-size="{size * 0.38}px">{initials(merchant.name)}</span>
      {/if}
    </span>
    {#if category}
      <span class="badge" style:width="{size * 0.46}px" style:height="{size * 0.46}px" style:color={category.color} style:--c={category.color}>
        <Icon name={category.symbol} size={size * 0.25} stroke={2.4} />
      </span>
    {/if}
  {:else if category && category.key !== UNCATEGORIZED}
    <span class="main" style:background="color-mix(in srgb, {category.color} 20%, transparent)" style:color={category.color}>
      <Icon name={category.symbol} size={size * 0.44} stroke={2} />
    </span>
  {:else}
    {@const color = colorFor(name)}
    <span class="main" style:background="color-mix(in srgb, {color} 22%, transparent)" style:color={color}>
      <span class="ini" style:font-size="{size * 0.38}px">{initials(name)}</span>
    </span>
  {/if}
</span>

<style>
  .avatar { position: relative; flex: none; display: inline-block; }
  .main { position: absolute; inset: 0; border-radius: 50%; display: grid; place-items: center; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1); }
  .main img { width: 100%; height: 100%; object-fit: cover; }
  .main.logo img { object-fit: contain; }
  .ini { font-weight: 700; letter-spacing: -0.02em; color: inherit; }
  .main:not([style*='color-mix']) .ini { color: #fff; }
  .badge {
    position: absolute; right: -12%; bottom: -12%; border-radius: 50%; display: grid; place-items: center;
    background: #101614; box-shadow: 0 0 0 2px #101614, inset 0 0 0 99px color-mix(in srgb, var(--c) 22%, transparent);
  }
</style>
