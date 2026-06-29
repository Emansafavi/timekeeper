<script lang="ts">
  import { tick } from 'svelte';
  import { Bold, Code, Eye, Heading2, Italic, Link, List, ListOrdered, PenLine, Quote } from '@lucide/svelte';
  import MarkdownText from './MarkdownText.svelte';

  export let value = '';
  export let label = 'Note';
  export let placeholder = '';
  export let required = false;

  let textarea: HTMLTextAreaElement;
  let preview = false;

  async function replaceSelection(next: string, selectStart: number, selectEnd: number) {
    value = next;
    preview = false;
    await tick();
    textarea?.focus();
    textarea?.setSelectionRange(selectStart, selectEnd);
  }

  function wrap(prefix: string, suffix = prefix, sample = 'text') {
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || sample;
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;
    replaceSelection(next, start + prefix.length, start + prefix.length + selected.length);
  }

  function prefixLines(prefix: string, sample = 'item') {
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || sample;
    const lines = selected.split('\n');
    const block = lines.map((line) => `${prefix}${line || sample}`).join('\n');
    const next = `${value.slice(0, start)}${block}${value.slice(end)}`;
    replaceSelection(next, start + prefix.length, start + block.length);
  }

  function orderedList() {
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || 'item';
    const lines = selected.split('\n');
    const block = lines.map((line, index) => `${index + 1}. ${line || 'item'}`).join('\n');
    const next = `${value.slice(0, start)}${block}${value.slice(end)}`;
    replaceSelection(next, start + 3, start + block.length);
  }

  function link() {
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || 'link';
    const next = `${value.slice(0, start)}[${selected}](https://)${value.slice(end)}`;
    replaceSelection(next, start + selected.length + 3, start + selected.length + 11);
  }
</script>

<label class="markdown-field">
  {label}
  <div class="markdown-editor">
    <div class="markdown-toolbar" aria-label="Markdown toolbar">
      <button type="button" class="secondary icon-button" title="Heading" on:click={() => prefixLines('## ', 'Heading')}>
        <Heading2 size={17} />
      </button>
      <button type="button" class="secondary icon-button" title="Bold" on:click={() => wrap('**')}>
        <Bold size={17} />
      </button>
      <button type="button" class="secondary icon-button" title="Italic" on:click={() => wrap('*')}>
        <Italic size={17} />
      </button>
      <button type="button" class="secondary icon-button" title="Inline code" on:click={() => wrap('`', '`', 'code')}>
        <Code size={17} />
      </button>
      <button type="button" class="secondary icon-button" title="Quote" on:click={() => prefixLines('> ', 'Quote')}>
        <Quote size={17} />
      </button>
      <button type="button" class="secondary icon-button" title="Bullet list" on:click={() => prefixLines('- ')}>
        <List size={17} />
      </button>
      <button type="button" class="secondary icon-button" title="Numbered list" on:click={orderedList}>
        <ListOrdered size={17} />
      </button>
      <button type="button" class="secondary icon-button" title="Link" on:click={link}>
        <Link size={17} />
      </button>
      <button
        type="button"
        class="secondary icon-button"
        title={preview ? 'Edit' : 'Preview'}
        aria-pressed={preview}
        on:click={() => (preview = !preview)}
      >
        {#if preview}<PenLine size={17} />{:else}<Eye size={17} />{/if}
      </button>
    </div>

    {#if preview}
      <div class="markdown-preview">
        {#if value.trim()}
          <MarkdownText text={value} />
        {:else}
          <p class="help">Nothing to preview yet.</p>
        {/if}
      </div>
    {:else}
      <textarea bind:this={textarea} bind:value {required} {placeholder}></textarea>
    {/if}
  </div>
</label>
