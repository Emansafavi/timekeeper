<script lang="ts">
  import { onMount } from 'svelte';
  import { Archive, Bell, Globe2, Pencil, Plus, RotateCcw, Save, X } from '@lucide/svelte';
  import type { Profile } from '$lib/types';
  import { appState, mutate, refreshState } from '$lib/client/state';

  let reminderTime = '20:00';
  let notificationsEnabled = false;
  let allowOverlaps = false;
  let timezone = 'UTC';
  let deviceTimezone = 'UTC';
  let profileName = '';
  let profileColor = '#007aff';
  let profileCategory = '';
  let editingProfileId: number | null = null;
  let editProfileName = '';
  let editProfileColor = '#007aff';
  let editProfileCategory = '';
  let permission = 'default';

  $: activeProfiles = $appState?.profiles.filter((profile) => !profile.archived) || [];
  $: archivedProfiles = $appState?.profiles.filter((profile) => profile.archived) || [];

  onMount(async () => {
    deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const state = await refreshState().catch(() => null);
    if (state) {
      reminderTime = state.settings.reminderTime;
      notificationsEnabled = state.settings.notificationsEnabled;
      allowOverlaps = state.settings.allowOverlaps;
      timezone = state.settings.timezone || deviceTimezone;
    }
    if (typeof Notification !== 'undefined') permission = Notification.permission;
  });

  async function saveSettings() {
    await mutate('/api/settings', { reminderTime, notificationsEnabled, allowOverlaps, timezone, firstRunComplete: true }, 'PATCH');
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return;
    permission = await Notification.requestPermission();
    notificationsEnabled = permission === 'granted';
    await saveSettings();
  }

  async function addProfile() {
    await mutate('/api/profiles', { name: profileName, color: profileColor, category: profileCategory });
    profileName = '';
    profileCategory = '';
  }

  function editProfile(profile: Profile) {
    editingProfileId = profile.id;
    editProfileName = profile.name;
    editProfileColor = profile.color;
    editProfileCategory = profile.category || '';
  }

  function cancelEditProfile() {
    editingProfileId = null;
    editProfileName = '';
    editProfileColor = '#007aff';
    editProfileCategory = '';
  }

  async function saveProfile(profile: Profile) {
    await mutate(
      '/api/profiles',
      {
        id: profile.id,
        name: editProfileName,
        color: editProfileColor,
        category: editProfileCategory,
        archived: profile.archived
      },
      'PATCH'
    );
    cancelEditProfile();
  }
</script>

<section class="page-header">
  <div>
    <h2>Settings</h2>
    <p>Profiles, reminders, overlaps, and self-hosting notes.</p>
  </div>
</section>

<section class="split">
  <div class="panel grid">
    <h2 class="section-heading">Daily reminder</h2>
    <div class="grid two">
      <label>Reminder time
        <input type="time" bind:value={reminderTime} />
      </label>
      <label>Timezone
        <input bind:value={timezone} placeholder={deviceTimezone} />
      </label>
      <label>Overlapping entries
        <span class="toggle-row">
          <span>{allowOverlaps ? 'Allowed intentionally' : 'Blocked by default'}</span>
          <input type="checkbox" bind:checked={allowOverlaps} />
        </span>
      </label>
    </div>
    <div class="actions">
      <button on:click={saveSettings}><Save size={18} /> Save settings</button>
      <button class="secondary" on:click={() => (timezone = deviceTimezone)}><Globe2 size={18} /> Use device timezone</button>
      <button class="secondary" on:click={enableNotifications}><Bell size={18} /> Enable notifications</button>
    </div>
    <p class="help">
      Browser notifications work while the installed PWA or a tab is alive. Local-only Tailscale hosting cannot rely on Apple or Google push delivery without adding Web Push keys and external push services, so the app also shows an in-app reminder when today has no entry.
    </p>
    <span class="chip">Permission: {permission}</span>
  </div>

  <div class="panel grid">
    <h2 class="section-heading">Profiles</h2>
    <form class="grid" on:submit|preventDefault={addProfile}>
      <div class="grid two">
        <label>Name <input bind:value={profileName} placeholder="New profile" required /></label>
        <label>Color <input type="color" bind:value={profileColor} /></label>
      </div>
      <label>Category <input bind:value={profileCategory} placeholder="Work, Study, Art" /></label>
      <button disabled={!profileName.trim()}><Plus size={18} /> Add profile</button>
    </form>
    <div class="entry-list">
      {#each activeProfiles as profile}
        {#if editingProfileId === profile.id}
          <article class="entry-row profile-editor">
            <div class="grid two">
              <label>Name <input bind:value={editProfileName} required /></label>
              <label>Color <input type="color" bind:value={editProfileColor} /></label>
            </div>
            <label>Category <input bind:value={editProfileCategory} placeholder="Work, Study, Personal" /></label>
            <div class="actions">
              <button disabled={!editProfileName.trim()} on:click={() => saveProfile(profile)}><Save size={18} /> Save</button>
              <button type="button" class="secondary" on:click={cancelEditProfile}><X size={18} /> Cancel</button>
            </div>
          </article>
        {:else}
          <article class="entry-row">
            <div>
              <div class="chip-row">
                <span class="chip"><span class="dot" style={`background:${profile.color}`}></span>{profile.name}</span>
                {#if profile.category}<span class="chip">{profile.category}</span>{/if}
              </div>
            </div>
            <div class="actions">
              <button class="secondary" title="Edit" on:click={() => editProfile(profile)}><Pencil size={17} /></button>
              <button
                class="secondary"
                title={profile.archived ? 'Unarchive' : 'Archive'}
                on:click={() => mutate('/api/profiles', { id: profile.id, archived: !profile.archived }, 'PATCH')}
              >
                {#if profile.archived}<RotateCcw size={17} />{:else}<Archive size={17} />{/if}
              </button>
            </div>
          </article>
        {/if}
      {/each}
      {#if archivedProfiles.length}
        <details class="archive-menu">
          <summary>Archive <span class="chip">{archivedProfiles.length}</span></summary>
          <div class="entry-list">
            {#each archivedProfiles as profile}
              {#if editingProfileId === profile.id}
                <article class="entry-row profile-editor">
                  <div class="grid two">
                    <label>Name <input bind:value={editProfileName} required /></label>
                    <label>Color <input type="color" bind:value={editProfileColor} /></label>
                  </div>
                  <label>Category <input bind:value={editProfileCategory} placeholder="Work, Study, Personal" /></label>
                  <div class="actions">
                    <button disabled={!editProfileName.trim()} on:click={() => saveProfile(profile)}><Save size={18} /> Save</button>
                    <button type="button" class="secondary" on:click={cancelEditProfile}><X size={18} /> Cancel</button>
                  </div>
                </article>
              {:else}
                <article class="entry-row">
                  <div>
                    <div class="chip-row">
                      <span class="chip"><span class="dot" style={`background:${profile.color}`}></span>{profile.name}</span>
                      {#if profile.category}<span class="chip">{profile.category}</span>{/if}
                    </div>
                  </div>
                  <div class="actions">
                    <button class="secondary" title="Edit" on:click={() => editProfile(profile)}><Pencil size={17} /></button>
                    <button
                      class="secondary"
                      title="Unarchive"
                      on:click={() => mutate('/api/profiles', { id: profile.id, archived: false }, 'PATCH')}
                    >
                      <RotateCcw size={17} />
                    </button>
                  </div>
                </article>
              {/if}
            {/each}
          </div>
        </details>
      {/if}
    </div>
  </div>
</section>

<section class="panel">
  <h2 class="section-heading">Backup and restore</h2>
  <p class="help">
    The database is a single SQLite file at <code>data/timekeeper.sqlite</code> on the host when using Docker Compose. Stop the container before a cold backup, or copy the database plus its <code>-wal</code> and <code>-shm</code> files together while it is running.
  </p>
  <pre><code>docker compose stop
cp data/timekeeper.sqlite backups/timekeeper-$(date +%F).sqlite
docker compose up -d</code></pre>
  <p class="help">
    Restore by stopping the container, replacing <code>data/timekeeper.sqlite</code> with the backup, then starting the container again.
  </p>
</section>
