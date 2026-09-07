<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";

  interface NavItem {
    title: string;
    note?: string;
  }

  const lessons: NavItem[] = [
    { title: "Урок 1 · hello world" },
    { title: "Урок 2 · выражения" },
  ];

  const tracks: NavItem[] = [
    { title: "Сеть" },
    { title: "Интерпретатор" },
    { title: "Многозадачность" },
  ];

  let version = $state("—");

  const starterCode = `; первый урок скоро будет здесь
(display "hello, scheme!")
(newline)
`;

  onMount(async () => {
    try {
      version = await invoke<string>("app_version");
    } catch {
      version = "—";
    }
  });
</script>

<header class="app-header">
  <span class="app-title">zchemer</span>
  <span class="app-subtitle">обучение Scheme · R6RS</span>
  <span class="app-version">v{version}</span>
</header>

<div class="app-body">
  <aside class="sidebar">
    <p class="sidebar-heading">База</p>
    <ul class="nav-list">
      {#each lessons as lesson (lesson.title)}
        <li class="nav-item">{lesson.title}</li>
      {/each}
    </ul>
    <p class="sidebar-heading">Треки</p>
    <ul class="nav-list">
      {#each tracks as track (track.title)}
        <li class="nav-item">{track.title}</li>
      {/each}
    </ul>
  </aside>

  <main class="workbench">
    <section class="lesson-pane">
      <h2>Hello, Scheme!</h2>
      <p>Каркас приложения стоит. Текст уроков появится здесь в следующем шаге.</p>
    </section>

    <section class="editor-pane">
      <div class="pane-toolbar">
        <button class="btn" disabled>Запустить</button>
        <button class="btn" disabled>Проверить</button>
      </div>
      <pre class="editor">{starterCode}</pre>
    </section>

    <section class="output-pane">
      <p class="pane-placeholder">Вывод исполнителя кода появится здесь.</p>
    </section>
  </main>
</div>

<style>
  :root {
    font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
    font-size: 16px;
    line-height: 24px;
    font-weight: 400;

    --bg: #f6f6f6;
    --fg: #0f0f0f;
    --surface: #ffffff;
    --border: #d0d7de;
    --muted: #57606a;
    --header-bg: #1e1e2e;
    --header-fg: #cdd6f4;
    --title-fg: #89b4fa;
    --subtitle-fg: #a6adc8;
    --version-fg: #6c7086;
    --nav-hover: #e8edf2;
    --editor-bg: #1e1e2e;
    --editor-fg: #cdd6f4;

    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #2f2f2f;
      --fg: #f6f6f6;
      --surface: #3a3f47;
      --border: #444c56;
      --muted: #adbac7;
      --nav-hover: #484f58;
    }
  }

  * {
    box-sizing: border-box;
  }

  :global(html),
  :global(body) {
    margin: 0;
    height: 100%;
  }

  .app-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 12px 16px;
    background: var(--header-bg);
    color: var(--header-fg);
  }

  .app-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--title-fg);
  }

  .app-subtitle {
    font-size: 0.9rem;
    color: var(--subtitle-fg);
  }

  .app-version {
    margin-left: auto;
    font-size: 0.8rem;
    color: var(--version-fg);
  }

  .app-body {
    display: flex;
    height: calc(100vh - 53px);
    background: var(--bg);
    color: var(--fg);
  }

  .sidebar {
    width: 220px;
    flex-shrink: 0;
    padding: 16px;
    border-right: 1px solid var(--border);
    overflow-y: auto;
  }

  .sidebar-heading {
    margin: 12px 0 6px;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nav-item {
    padding: 6px 8px;
    border-radius: 6px;
  }

  .nav-item:hover {
    background: var(--nav-hover);
  }

  .workbench {
    flex: 1;
    display: grid;
    grid-template-rows: minmax(0, 2fr) minmax(0, 3fr) minmax(0, 1.5fr);
    gap: 8px;
    padding: 12px;
  }

  .lesson-pane,
  .editor-pane,
  .output-pane {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    overflow: auto;
    background: var(--surface);
  }

  .lesson-pane h2 {
    margin: 0 0 8px;
    font-size: 1.1rem;
  }

  .pane-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .btn {
    border-radius: 6px;
    border: 1px solid transparent;
    padding: 6px 14px;
    font-size: 0.9rem;
    font-weight: 500;
    font-family: inherit;
    color: #ffffff;
    background: #4a9eff;
    cursor: pointer;
  }

  .btn:disabled {
    background: #aeb4bc;
    cursor: not-allowed;
  }

  .editor {
    margin: 0;
    padding: 12px;
    border-radius: 6px;
    background: var(--editor-bg);
    color: var(--editor-fg);
    font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    overflow: auto;
  }

  .pane-placeholder {
    margin: 0;
    color: var(--muted);
    font-style: italic;
  }
</style>
