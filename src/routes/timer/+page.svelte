<script lang="ts">
  import { onMount } from 'svelte';
  import { Pause, Play, RotateCcw, Square } from '@lucide/svelte';
  import { apiError, appState, mutate, refreshState } from '$lib/client/state';
  import { formatDuration } from '$lib/format';

  let profileId = '';
  let tags = '';
  let note = '';
  let busy = false;
  let tick = Date.now();

  onMount(() => {
    refreshState()
      .then((state) => {
        profileId = String(state?.profiles.find((profile) => !profile.archived)?.id || '');
      })
      .catch(() => undefined);
    const id = window.setInterval(() => (tick = Date.now()), 1000);
    return () => window.clearInterval(id);
  });

  $: active = $appState?.activeTimer;
  $: elapsed = active
    ? active.status === 'running'
      ? active.elapsedSeconds + Math.max(0, Math.floor((tick - ($appState?.fetchedAt || tick)) / 1000))
      : active.elapsedSeconds
    : 0;

  async function run(action: () => Promise<unknown>) {
    busy = true;
    try {
      await action();
      note = '';
    } finally {
      busy = false;
    }
  }
</script>

<section class="page-header">
  <div>
    <h2>Timer</h2>
    <p>Start, pause, resume, and stop with a short note.</p>
  </div>
</section>

<section class="panel timer-hero">
  <span class="eyebrow">{active ? active.profileName : 'Ready'}</span>
  <div class="timer-display">{formatDuration(elapsed)}</div>
  {#if active}
    <div class="chip-row" style="justify-content:center">
      <span class="chip">{active.status}</span>
      {#each active.tags as tag}<span class="chip">#{tag}</span>{/each}
    </div>
    <div class="actions center">
      {#if active.status === 'running'}
        <button disabled={busy} on:click={() => run(() => mutate('/api/timer/pause'))}><Pause size={18} /> Pause</button>
      {:else}
        <button disabled={busy} on:click={() => run(() => mutate('/api/timer/resume'))}><Play size={18} /> Resume</button>
      {/if}
      <button class="secondary" disabled={busy} on:click={() => run(() => mutate('/api/timer/stop', { discard: true }))}><RotateCcw size={18} /> Discard</button>
    </div>
  {:else}
    <div class="grid two" style="text-align:left">
      <label>Profile
        <select bind:value={profileId}>
          {#each $appState?.profiles.filter((profile) => !profile.archived) || [] as profile}
            <option value={profile.id}>{profile.name}</option>
          {/each}
        </select>
      </label>
      <label>Tags
        <input bind:value={tags} placeholder="research, invoice, practice" />
      </label>
    </div>
    <div class="actions center">
      <button disabled={busy || !profileId} on:click={() => run(() => mutate('/api/timer/start', { profileId, tags }))}><Play size={18} /> Start timer</button>
    </div>
  {/if}
</section>

{#if active}
  <section class="panel">
    <label>What did you do?
      <textarea bind:value={note} placeholder="Drafted report, fixed issue, practiced piece..."></textarea>
    </label>
    <div class="actions" style="margin-top:12px">
      <button disabled={busy || !note.trim()} on:click={() => run(() => mutate('/api/timer/stop', { note }))}><Square size={18} /> Stop and save</button>
    </div>
  </section>
{/if}

{#if $apiError}
  <section class="panel error">{$apiError}</section>
{/if}
