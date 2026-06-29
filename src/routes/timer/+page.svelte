<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Pause, Play, RotateCcw, Square } from '@lucide/svelte';
  import MarkdownEditor from '$lib/components/MarkdownEditor.svelte';
  import { apiError, appState, mutate, refreshState } from '$lib/client/state';
  import { formatDuration } from '$lib/format';

  let profileId = '';
  let tags = '';
  let note = '';
  let busy = false;
  let tick = Date.now();
  let draftTimerId: number | null = null;
  let draftReady = false;

  $: activeProfiles = $appState?.profiles.filter((profile) => !profile.archived) || [];
  $: if (activeProfiles.length && !activeProfiles.some((profile) => String(profile.id) === profileId)) {
    profileId = String(activeProfiles[0].id);
  }

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

  $: if (browser && active?.id && draftTimerId !== active.id) {
    draftTimerId = active.id;
    note = window.localStorage.getItem(draftKey(active.id)) || '';
    draftReady = true;
  }

  $: if (browser && active?.id && draftReady && draftTimerId === active.id) {
    if (note) {
      window.localStorage.setItem(draftKey(active.id), note);
    } else {
      window.localStorage.removeItem(draftKey(active.id));
    }
  }

  $: if (!active) {
    draftTimerId = null;
    draftReady = false;
  }

  function draftKey(timerId: number) {
    return `timekeeper:timer-note-draft:${timerId}`;
  }

  function clearDraft(timerId: number | null | undefined) {
    if (!browser || !timerId) return;
    window.localStorage.removeItem(draftKey(timerId));
  }

  async function run(action: () => Promise<unknown>, options: { clearNote?: boolean; clearDraft?: boolean } = {}) {
    busy = true;
    const timerId = active?.id;
    try {
      await action();
      if (options.clearDraft) clearDraft(timerId);
      if (options.clearNote) note = '';
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
      <button class="secondary" disabled={busy} on:click={() => run(() => mutate('/api/timer/stop', { discard: true }), { clearNote: true, clearDraft: true })}><RotateCcw size={18} /> Discard</button>
    </div>
  {:else}
    <div class="grid two" style="text-align:left">
      <label>Profile
        <select bind:value={profileId}>
          {#each activeProfiles as profile}
            <option value={String(profile.id)}>{profile.name}</option>
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
    <MarkdownEditor bind:value={note} label="What did you do?" placeholder="Drafted report, fixed issue, practiced piece..." />
    <div class="actions" style="margin-top:12px">
      <button disabled={busy || !note.trim()} on:click={() => run(() => mutate('/api/timer/stop', { note }), { clearNote: true, clearDraft: true })}><Square size={18} /> Stop and save</button>
    </div>
  </section>
{/if}

{#if $apiError}
  <section class="panel error">{$apiError}</section>
{/if}
