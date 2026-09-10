<script lang="ts">
  import { onDestroy } from "svelte";
  import { EditorView } from "@codemirror/view";
  import { EditorState } from "@codemirror/state";
  import { StreamLanguage } from "@codemirror/language";
  import { scheme } from "@codemirror/legacy-modes/mode/scheme";
  import { oneDark } from "@codemirror/theme-one-dark";
import { marked } from "marked";

interface Props {
  markdown: string;
}

let { markdown }: Props = $props();

let host: HTMLDivElement;
let views: EditorView[] = [];

const schemeLanguage = StreamLanguage.define(scheme);

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function unescapeHtml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

const CODE_BLOCK_RE =
  /<pre><code(?: class="language-scheme")?>([\s\S]*?)<\/code><\/pre>/g;

function renderTheory(source: string): string {
  const html = marked.parse(source) as string;
  return html.replace(CODE_BLOCK_RE, (_match, escapedCode: string) => {
    const code = unescapeHtml(escapedCode);
    return `<pre class="theory-example" data-code="${escapeAttr(code)}"></pre>`;
  });
}

function mountExamples() {
  host.querySelectorAll<HTMLElement>("pre.theory-example").forEach((pre) => {
    const doc = pre.getAttribute("data-code") ?? "";
    pre.removeAttribute("data-code");
    const view = new EditorView({
      state: EditorState.create({
        doc,
        extensions: [
          schemeLanguage,
          oneDark,
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          EditorView.lineWrapping,
          EditorView.theme({
            "&": { height: "auto", backgroundColor: "#1e1e2e" },
            ".cm-scroller": { overflow: "hidden" },
          }),
        ],
      }),
      parent: pre,
    });
    views.push(view);
  });
}

  $effect(() => {
    if (!host) return;
    views.forEach((view) => view.destroy());
    views = [];
    host.innerHTML = renderTheory(markdown);
    mountExamples();
  });

  onDestroy(() => {
    views.forEach((view) => view.destroy());
  });
</script>

<div bind:this={host} class="theory"></div>

<style>
  .theory :global(h1) {
    font-size: 1.35rem;
    margin: 0 0 12px;
  }

  .theory :global(h2) {
    font-size: 1.1rem;
    margin: 20px 0 8px;
  }

  .theory :global(p) {
    margin: 0 0 12px;
  }

  .theory :global(ul),
  .theory :global(ol) {
    margin: 0 0 12px;
    padding-left: 24px;
  }

  .theory :global(code) {
    background: var(--nav-hover);
    border-radius: 4px;
    padding: 1px 5px;
    font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
    font-size: 0.85em;
  }

  .theory :global(pre.theory-plain) {
    margin: 0 0 12px;
    padding: 10px;
    border-radius: 6px;
    background: var(--nav-hover);
    overflow-x: auto;
    font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
    font-size: 0.85rem;
  }

  .theory :global(pre.theory-example) {
    margin: 0 0 12px;
    border-radius: 6px;
    overflow: hidden;
  }
</style>