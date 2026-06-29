<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Play } from '@lucide/svelte';
  import { appState, refreshState } from '$lib/client/state';
  import { formatClock, formatDate, formatDuration } from '$lib/format';

  let tick = Date.now();
  onMount(() => {
    refreshState().catch(() => undefined);
    const id = window.setInterval(() => (tick = Date.now()), 1000);
    return () => window.clearInterval(id);
  });

  $: timerSeconds =
    $appState?.activeTimer?.status === 'running'
      ? $appState.activeTimer.elapsedSeconds + Math.floor((tick - $appState.fetchedAt) / 1000)
      : $appState?.activeTimer?.elapsedSeconds || 0;
  $: maxProfileSeconds = Math.max(1, ...($appState?.stats.byProfile.map((item) => item.seconds) || [1]));
</script>

<section class="page-header">
  <div>
    <h2>Dashboard</h2>
    <p>Today, this week, and the rhythm of the last month.</p>
  </div>
  <a class="button" href="/timer"><Play size={18} /> Start</a>
</section>

{#if $appState && !$appState.stats.hasTodayEntry && !$appState.activeTimer}
  <section class="panel banner">
    Your journal is empty for today. A quick entry now keeps the evening clean.
  </section>
{/if}

{#if $appState?.activeTimer}
  <section class="panel timer-hero">
    <span class="eyebrow">Running now</span>
    <div class="timer-display">{formatDuration(Math.max(timerSeconds, $appState.activeTimer.elapsedSeconds))}</div>
    <div class="chip-row" style="justify-content:center">
      <span class="chip"><span class="dot" style={`background:${$appState.activeTimer.profileColor}`}></span>{$appState.activeTimer.profileName}</span>
      <span class="chip">{$appState.activeTimer.status}</span>
    </div>
    <div class="actions center">
      <a class="button" href="/timer">Open timer <ArrowRight size={18} /></a>
    </div>
  </section>
{/if}

{#if $appState}
  <section class="grid three">
    <div class="panel stat"><span>Today</span><strong>{formatDuration($appState.stats.todaySeconds)}</strong></div>
    <div class="panel stat"><span>This week</span><strong>{formatDuration($appState.stats.weekSeconds)}</strong></div>
    <div class="panel stat"><span>This month</span><strong>{formatDuration($appState.stats.monthSeconds)}</strong></div>
  </section>

  <section class="split">
    <div class="panel">
      <div class="page-header">
        <div>
          <h2 class="section-heading">Week by profile</h2>
          <p>Grouped from Monday onward.</p>
        </div>
      </div>
      <div class="bar-list">
        {#each $appState.stats.byProfile as item}
          <div class="bar">
            <div class="entry-row" style="grid-template-columns:minmax(0,1fr) auto; box-shadow:none">
              <div class="chip-row">
                <span class="chip"><span class="dot" style={`background:${item.profileColor}`}></span>{item.profileName}</span>
              </div>
              <strong>{formatDuration(item.seconds)}</strong>
            </div>
            <div class="bar-track"><div class="bar-fill" style={`--w:${Math.max(4, (item.seconds / maxProfileSeconds) * 100)}%; background:${item.profileColor}`}></div></div>
          </div>
        {:else}
          <p class="help">No entries this week yet.</p>
        {/each}
      </div>
    </div>

    <div class="panel">
      <div class="page-header">
        <div>
          <h2 class="section-heading">Last 28 days</h2>
          <p>Each square is one local day.</p>
        </div>
      </div>
      <div class="calendar-grid" aria-label="Calendar overview">
        {#each $appState.stats.calendar as day}
          <div class="day-cell" title={`${day.date}: ${formatDuration(day.seconds)}`} style={`--heat:${Math.min(82, 10 + day.seconds / 180)}%`}></div>
        {/each}
      </div>
    </div>
  </section>

  <section class="panel">
    <div class="page-header">
      <div>
        <h2 class="section-heading">Recent journal</h2>
        <p>Readable notes from the latest entries.</p>
      </div>
      <a class="button secondary" href="/reports">Reports</a>
    </div>
    <div class="entry-list">
      {#each $appState.recentEntries.slice(0, 8) as entry}
        <article class="entry-row">
          <div>
            <div class="chip-row">
              <span class="chip"><span class="dot" style={`background:${entry.profileColor}`}></span>{entry.profileName}</span>
              <span class="chip">{formatDate(entry.startAt)} {formatClock(entry.startAt)}-{formatClock(entry.endAt)}</span>
            </div>
            <h3>{entry.note}</h3>
            {#if entry.tags.length}
              <p>{entry.tags.map((tag) => `#${tag}`).join(' ')}</p>
            {/if}
          </div>
          <strong>{formatDuration(entry.durationSeconds)}</strong>
        </article>
      {:else}
        <p class="help">No entries yet. Start with the Timer tab or add one manually.</p>
      {/each}
    </div>
  </section>
{/if}
