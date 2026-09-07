<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
  import { EditorState } from "@codemirror/state";
  import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
  import { StreamLanguage } from "@codemirror/language";
  import { scheme } from "@codemirror/legacy-modes/mode/scheme";
  import { oneDark } from "@codemirror/theme-one-dark";

  interface Props {
    code: string;
  }

  let { code = $bindable() }: Props = $props();

  let host: HTMLDivElement;
  let view: EditorView;

  function createView() {
    const extensions = [
      lineNumbers(),
      highlightActiveLine(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      StreamLanguage.define(scheme),
      oneDark,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          code = update.state.doc.toString();
        }
      }),
    ];
    view = new EditorView({
      state: EditorState.create({ doc: code, extensions }),
      parent: host,
    });
  }

  onMount(() => {
    createView();
  });

  // Reflect external changes to `code` (e.g. loading a lesson) into the editor
  $effect(() => {
    if (view && view.state.doc.toString() !== code) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: code },
      });
    }
  });

  onDestroy(() => {
    view?.destroy();
  });
</script>

<div bind:this={host} class="cm-host" aria-label="Редактор кода"></div>

<style>
  .cm-host {
    height: 100%;
    overflow: hidden;
    border-radius: 6px;
  }

  .cm-host :global(.cm-editor) {
    height: 100%;
    font-size: 0.9rem;
  }

  .cm-host :global(.cm-scroller) {
    font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
  }
</style>