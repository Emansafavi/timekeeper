<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { BarChart3, Clock3, Home, ListPlus, Settings, Timer } from '@lucide/svelte';
  import { apiError, appState, refreshState } from '$lib/client/state';

  const nav = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/timer', label: 'Timer', icon: Timer },
    { href: '/manual', label: 'Manual', icon: ListPlus },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/settings', label: 'Settings', icon: Settings }
  ];

  function current(href: string) {
    if (href === '/') return $page.url.pathname === '/';
    return $page.url.pathname.startsWith(href);
  }

  function scheduleReminder() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const state = $appState;
    if (!state?.settings.notificationsEnabled || Notification.permission !== 'granted') return;
    const [hour, minute] = state.settings.reminderTime.split(':').map(Number);
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    window.setTimeout(() => {
      const latest = $appState;
      if (latest && !latest.stats.hasTodayEntry) {
        new Notification('Timekeeper', { body: 'No work logged today yet.' });
      }
      scheduleReminder();
    }, next.getTime() - Date.now());
  }

  onMount(async () => {
    await refreshState().catch(() => undefined);
    scheduleReminder();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
  });

  afterNavigate(() => {
    refreshState().catch(() => undefined);
  });
</script>

<svelte:head>
  <title>Timekeeper</title>
</svelte:head>

<div class="app-shell">
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true"></div>
      <div>
        <h1>Timekeeper</h1>
        <p>Calm time tracking on your own network</p>
      </div>
    </div>
    {#if $appState?.activeTimer}
      <a class="button secondary" href="/timer"><Clock3 size={18} /> Running</a>
    {/if}
  </header>

  <div class="layout">
    <nav class="sidebar" aria-label="Primary">
      {#each nav as item}
        <a class="nav-link" href={item.href} aria-current={current(item.href) ? 'page' : undefined}>
          <svelte:component this={item.icon} size={19} />
          <span>{item.label}</span>
        </a>
      {/each}
    </nav>

    <main class="page">
      {#if $apiError}
        <div class="panel error">{$apiError}</div>
      {/if}
      <slot />
    </main>
  </div>
</div>

<nav class="mobile-nav" aria-label="Primary">
  {#each nav as item}
    <a href={item.href} aria-current={current(item.href) ? 'page' : undefined}>
      <svelte:component this={item.icon} size={21} />
      <span>{item.label}</span>
    </a>
  {/each}
</nav>
