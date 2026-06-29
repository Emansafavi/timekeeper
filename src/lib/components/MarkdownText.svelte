<script lang="ts">
  import { renderMarkdown } from '$lib/markdown';

  export let text = '';

  $: html = renderMarkdown(text);
</script>

<div class="markdown-note">{@html html}</div>
