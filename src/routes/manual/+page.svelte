<script lang="ts">
  import { onMount } from 'svelte';
  import { Pencil, Plus, Trash2, X } from '@lucide/svelte';
  import type { TimeEntry } from '$lib/types';
  import { appState, mutate, refreshState } from '$lib/client/state';
  import { formatClock, formatDate, formatDuration, isoToLocalInput, localInputToIso } from '$lib/format';

  let profileId = '';
  let startAt = '';
  let endAt = '';
  let note = '';
  let tags = '';
  let editing: TimeEntry | null = null;
  let busy = false;

  function resetForm() {
    const end = new Date();
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    startAt = isoToLocalInput(start.toISOString());
    endAt = isoToLocalInput(end.toISOString());
    note = '';
    tags = '';
    editing = null;
  }

  onMount(async () => {
    const state = await refreshState().catch(() => null);
    profileId = String(state?.profiles.find((profile) => !profile.archived)?.id || '');
    resetForm();
  });

  function edit(entry: TimeEntry) {
    editing = entry;
    profileId = String(entry.profileId);
    startAt = isoToLocalInput(entry.startAt);
    endAt = isoToLocalInput(entry.endAt);
    note = entry.note;
    tags = entry.tags.join(', ');
  }

  async function save() {
    busy = true;
    try {
      const body = {
        profileId: Number(profileId),
        startAt: localInputToIso(startAt),
        endAt: localInputToIso(endAt),
        note,
        tags,
        allowOverlap: $appState?.settings.allowOverlaps
      };
      if (editing) {
        await mutate(`/api/entries/${editing.id}`, body, 'PUT');
      } else {
        await mutate('/api/entries', body);
      }
      resetForm();
    } finally {
      busy = false;
    }
  }
</script>

<section class="page-header">
  <div>
    <h2>Manual Entry</h2>
    <p>Add, edit, or remove work when the timer was not running.</p>
  </div>
</section>

<section class="split">
  <form class="panel grid" on:submit|preventDefault={save}>
    <div class="grid two">
      <label>Profile
        <select bind:value={profileId}>
          {#each $appState?.profiles.filter((profile) => !profile.archived) || [] as profile}
            <option value={profile.id}>{profile.name}</option>
          {/each}
        </select>
      </label>
      <label>Tags
        <input bind:value={tags} placeholder="comma separated" />
      </label>
    </div>
    <div class="grid two">
      <label>Start
        <input type="datetime-local" bind:value={startAt} required />
      </label>
      <label>End
        <input type="datetime-local" bind:value={endAt} required />
      </label>
    </div>
    <label>What did you do?
      <textarea bind:value={note} required placeholder="Short note for the journal"></textarea>
    </label>
    <div class="actions">
      <button disabled={busy || !profileId || !note.trim()}><Plus size={18} /> {editing ? 'Update entry' : 'Add entry'}</button>
      {#if editing}<button type="button" class="secondary" on:click={resetForm}><X size={18} /> Cancel</button>{/if}
    </div>
  </form>

  <section class="panel">
    <div class="page-header">
      <div>
        <h2 class="section-heading">Recent entries</h2>
        <p>Tap edit to correct a log.</p>
      </div>
    </div>
    <div class="entry-list">
      {#each $appState?.recentEntries.slice(0, 10) || [] as entry}
        <article class="entry-row">
          <div>
            <div class="chip-row">
              <span class="chip"><span class="dot" style={`background:${entry.profileColor}`}></span>{entry.profileName}</span>
              <span class="chip">{formatDate(entry.startAt)} {formatClock(entry.startAt)}-{formatClock(entry.endAt)}</span>
            </div>
            <h3>{entry.note}</h3>
            <p>{formatDuration(entry.durationSeconds)}</p>
          </div>
          <div class="actions">
            <button class="secondary" title="Edit" on:click={() => edit(entry)}><Pencil size={17} /></button>
            <button class="danger" title="Delete" on:click={() => mutate(`/api/entries/${entry.id}`, undefined, 'DELETE')}><Trash2 size={17} /></button>
          </div>
        </article>
      {:else}
        <p class="help">No entries yet.</p>
      {/each}
    </div>
  </section>
</section>
