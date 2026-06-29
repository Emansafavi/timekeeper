<script lang="ts">
  import { onMount } from 'svelte';
  import { Download, Filter } from '@lucide/svelte';
  import MarkdownText from '$lib/components/MarkdownText.svelte';
  import type { TimeEntry } from '$lib/types';
  import { appState, requestJson, refreshState } from '$lib/client/state';
  import { formatClock, formatDate, formatDuration } from '$lib/format';

  let from = '';
  let to = '';
  let profileId = '';
  let tag = '';
  let entries: TimeEntry[] = [];

  function query() {
    const params = new URLSearchParams();
    if (from) params.set('from', new Date(`${from}T00:00`).toISOString());
    if (to) params.set('to', new Date(`${to}T23:59`).toISOString());
    if (profileId) params.set('profileId', profileId);
    if (tag) params.set('tag', tag);
    return params.toString();
  }

  async function loadEntries() {
    const data = await requestJson<{ entries: TimeEntry[] }>(`/api/entries?${query()}`);
    entries = data.entries;
  }

  onMount(async () => {
    await refreshState().catch(() => undefined);
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    from = monthStart.toISOString().slice(0, 10);
    to = today.toISOString().slice(0, 10);
    await loadEntries().catch(() => undefined);
  });

  $: total = entries.reduce((sum, entry) => sum + entry.durationSeconds, 0);
  $: grouped = Object.values(
    entries.reduce<Record<string, { name: string; color: string; seconds: number }>>((acc, entry) => {
      acc[entry.profileName] ||= { name: entry.profileName, color: entry.profileColor, seconds: 0 };
      acc[entry.profileName].seconds += entry.durationSeconds;
      return acc;
    }, {})
  ).sort((a, b) => b.seconds - a.seconds);
  $: max = Math.max(1, ...grouped.map((item) => item.seconds));
</script>

<section class="page-header">
  <div>
    <h2>Reports</h2>
    <p>Filter, review, and export your work logs.</p>
  </div>
</section>

<section class="panel grid">
  <div class="grid two">
    <label>From <input type="date" bind:value={from} /></label>
    <label>To <input type="date" bind:value={to} /></label>
  </div>
  <div class="grid two">
    <label>Profile
      <select bind:value={profileId}>
        <option value="">All profiles</option>
        {#each $appState?.profiles || [] as profile}
          <option value={String(profile.id)}>{profile.name}</option>
        {/each}
      </select>
    </label>
    <label>Tag
      <select bind:value={tag}>
        <option value="">All tags</option>
        {#each $appState?.tags || [] as item}
          <option value={item}>{item}</option>
        {/each}
      </select>
    </label>
  </div>
  <div class="actions">
    <button on:click={loadEntries}><Filter size={18} /> Apply filters</button>
    <a class="button secondary" href={`/api/export.csv?${query()}`}><Download size={18} /> CSV</a>
    <a class="button secondary" href={`/api/export.xlsx?${query()}`}><Download size={18} /> XLSX</a>
  </div>
</section>

<section class="grid three">
  <div class="panel stat"><span>Selected total</span><strong>{formatDuration(total)}</strong></div>
  <div class="panel stat"><span>Entries</span><strong>{entries.length}</strong></div>
  <div class="panel stat"><span>Average</span><strong>{formatDuration(entries.length ? total / entries.length : 0)}</strong></div>
</section>

<section class="split">
  <div class="panel">
    <h2 class="section-heading">Profile summary</h2>
    <div class="bar-list">
      {#each grouped as item}
        <div class="bar">
          <div class="entry-row" style="box-shadow:none">
            <span class="chip"><span class="dot" style={`background:${item.color}`}></span>{item.name}</span>
            <strong>{formatDuration(item.seconds)}</strong>
          </div>
          <div class="bar-track"><div class="bar-fill" style={`--w:${Math.max(4, (item.seconds / max) * 100)}%; background:${item.color}`}></div></div>
        </div>
      {:else}
        <p class="help">No entries match the filter.</p>
      {/each}
    </div>
  </div>

  <div class="panel">
    <h2 class="section-heading">Daily journal</h2>
    <div class="entry-list">
      {#each entries as entry}
        <article class="entry-row">
          <div>
            <div class="chip-row">
              <span class="chip"><span class="dot" style={`background:${entry.profileColor}`}></span>{entry.profileName}</span>
              <span class="chip">{formatDate(entry.startAt)} {formatClock(entry.startAt)}-{formatClock(entry.endAt)}</span>
            </div>
            <MarkdownText text={entry.note} />
            {#if entry.tags.length}
              <div class="chip-row tag-row">
                {#each entry.tags as item}<span class="chip tag-chip">#{item}</span>{/each}
              </div>
            {/if}
          </div>
          <strong>{formatDuration(entry.durationSeconds)}</strong>
        </article>
      {:else}
        <p class="help">Nothing here yet.</p>
      {/each}
    </div>
  </div>
</section>
