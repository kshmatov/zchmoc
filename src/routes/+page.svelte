<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount } from "svelte";
  import CodeEditor from "$lib/CodeEditor.svelte";
  import Theory from "$lib/Theory.svelte";
  import { runScheme } from "$lib/scheme-runner";
  import { lessons, lessonById } from "$lib/lessons";
  import { tracks, trackById, lessonsOfTrack } from "$lib/tracks";
  import { buildTestProgram, parseTestReport } from "$lib/test-harness";
  import {
    markLessonDone,
    isLessonDone,
    getDraft,
    saveDraft,
    clearDraft,
    replaceAllProgress,
    hydrateProgress,
    completedLessons,
    drafts,
  } from "$lib/progress.svelte";
  import { exportProgress, importProgress } from "$lib/progress-io";

  let version = $state("—");

  const firstLesson = lessons[0];

  /** null — экран выбора трека. */
  let selectedTrackId = $state<string | null>("base");
  let selectedId = $state<string | null>(firstLesson.id);
  let code = $state(getDraft(firstLesson.id) ?? firstLesson.starter);
  let actionState = $state({ running: false, checking: false });
  let output = $state("");
  let notice = $state("");

  const selectedLesson = $derived(
    selectedId ? (lessonById.get(selectedId) ?? firstLesson) : null
  );

  const currentTrack = $derived(
    selectedTrackId ? (trackById.get(selectedTrackId) ?? null) : null
  );

  const backend = $derived(currentTrack?.systemAccess ? "sidecar" : "wasm");

  const currentTrackLessons = $derived(
    currentTrack ? lessonsOfTrack(currentTrack.id) : []
  );

  // Черновик сохраняется только для реальных правок (код отличается от
  // стартового) и только пока урок не пройден — для пройденного урока
  // чистка черновика не должна обращаться назад (AC T5).
  $effect(() => {
    const lesson = selectedLesson;
    if (!lesson || code === lesson.starter) return;
    if (isLessonDone(lesson.id)) return;
    saveDraft(lesson.id, code);
  });

  $effect(() => {
    const lesson = selectedLesson;
    if (!lesson) return;
    if (isLessonDone(lesson.id)) clearDraft(lesson.id);
  });

  const knownLessonIds = $derived(new Set(lessons.map((l) => l.id)));

  function selectLesson(lesson: (typeof lessons)[number]) {
    selectedId = lesson.id;
    code = isLessonDone(lesson.id)
      ? lesson.starter
      : (getDraft(lesson.id) ?? lesson.starter);
  }

  function openTrack(trackId: string) {
    selectedTrackId = trackId;
    const trackLessons = lessonsOfTrack(trackId);
    const target = trackLessons.find((l) => !isLessonDone(l.id)) ?? trackLessons[0];
    if (target) {
      selectLesson(target);
    } else {
      selectedId = null;
      code = "";
    }
  }

  function backToTracks() {
    selectedTrackId = null;
    selectedId = null;
  }

  async function handleExport() {
    notice = "";
    const result = await exportProgress({
      completedLessons: [...completedLessons],
      drafts: { ...drafts },
    });
    if (result.cancelled) return;
    notice = result.error
      ? `Экспорт не удался: ${result.error}`
      : "Прогресс выгружен в JSON-файл.";
  }

  async function handleImport() {
    notice = "";
    const result = await importProgress(knownLessonIds);
    if (result.cancelled) return;
    if (result.error) {
      notice = `Импорт не удался: ${result.error}`;
      return;
    }
    if (result.progress) {
      replaceAllProgress(result.progress.completedLessons, result.progress.drafts);
      if (selectedId) {
        const importedDraft = getDraft(selectedId);
        if (importedDraft !== undefined) code = importedDraft;
      }
      notice = "Прогресс импортирован: статусы и черновики восстановлены.";
    }
  }

  onMount(async () => {
    await hydrateProgress();
    if (selectedId) {
      const draft = getDraft(selectedId);
      if (draft !== undefined) code = draft;
    }
    try {
      version = await invoke<string>("app_version");
    } catch {
      version = "—";
    }
  });

  async function handleRun() {
    await runAction("running", async () => {
      if (code.trim() === "") {
        output = "Код пуст. Введите Scheme-программу в редакторе, затем нажмите «Запустить».";
        return;
      }
      const result = await runScheme(code, {
        isolate: backend === "wasm",
        backend,
      });
      output = [result.output, result.error && `Ошибка:\n${result.error}`]
        .filter(Boolean)
        .join("\n\n");
    });
  }

  async function handleCheck() {
    await runAction("checking", async () => {
      if (!selectedLesson) return;
      if (code.trim() === "") {
        output = "Код пуст. Введите Scheme-программу в редакторе, затем нажмите «Проверить».";
        return;
      }
      const result = await runScheme(
        buildTestProgram(code, selectedLesson.tests),
        {
          isolate: false,
          backend,
        }
      );
      const report = parseTestReport(result.output);
      if (!report) {
        output =
          result.error !== ""
            ? `Ошибка в коде:\n${result.error}`
            : "Тесты урока не описали результат. Обратитесь к автору урока.";
        return;
      }
      if (report.passed) {
        markLessonDone(selectedLesson.id);
        clearDraft(selectedLesson.id);
        output = `Тесты пройдены (${report.count - report.failedCount} из ${report.count}). Урок «${selectedLesson.title}» пройден.`;
        if (currentTrack?.id === "base" && currentTrackLessons.every((l) => isLessonDone(l.id))) {
          backToTracks();
          notice = "База пройдена! Выберите трек-проект для продолжения.";
        }
      } else {
        output = `Тесты не пройдены: ${report.failedCount} из ${report.count}\n\n${report.failures.join("\n")}`;
      }
    });
  }

  async function runAction(
    flag: "running" | "checking",
    action: () => Promise<void>
  ) {
    actionState[flag] = true;
    output = "";
    try {
      await action();
    } catch (err) {
      output = err instanceof Error ? err.message : String(err);
    } finally {
      actionState[flag] = false;
    }
  }
</script>

<header class="app-header">
  <span class="app-title">zchemer</span>
  <span class="app-subtitle">обучение Scheme · R6RS</span>
  <span class="app-version">v{version}</span>
</header>

<div class="app-body">
  {#if notice}
    <div class="notice">{notice}</div>
  {/if}

  {#if selectedTrackId === null || !currentTrack}
    <div class="track-picker">
      <div class="sidebar-actions">
        <button class="btn btn-ghost" type="button" onclick={handleExport}>Экспорт</button>
        <button class="btn btn-ghost" type="button" onclick={handleImport}>Импорт</button>
      </div>
      <h1 class="track-picker-title">Выбор трека</h1>
      <p class="track-picker-subtitle">
        Пройди базу Scheme, затем выбери трек-проект. Стартовые треки можно начинать в любом порядке.
      </p>
      <div class="track-grid">
        {#each tracks as track (track.id)}
          <button
            class="track-card"
            type="button"
            onclick={() => openTrack(track.id)}
          >
            <span class="track-card-title">{track.title}</span>
            <span class="track-card-desc">{track.description}</span>
            {#if lessonsOfTrack(track.id).length === 0}
              <span class="track-card-badge">уроки скоро</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <aside class="sidebar">
      <div class="sidebar-actions">
        <button class="btn btn-ghost" type="button" onclick={handleExport}>Экспорт</button>
        <button class="btn btn-ghost" type="button" onclick={handleImport}>Импорт</button>
      </div>
      <p class="sidebar-heading">{currentTrack.title}</p>
      <button class="btn btn-back" type="button" onclick={backToTracks}>← К выбору треков</button>
      {#if currentTrackLessons.length === 0}
        <p class="muted-note">В этом треке пока нет уроков. Загляни позже или выбери другой трек.</p>
      {/if}
      <ul class="nav-list">
        {#each currentTrackLessons as lesson (lesson.id)}
          <li class="nav-item {lesson.id === selectedId ? "active" : ""}">
            <button
              class="nav-button"
              type="button"
              onclick={() => selectLesson(lesson)}
            >
              <span class="nav-done">{isLessonDone(lesson.id) ? "✓ " : ""}</span>{lesson.title}
            </button>
          </li>
        {/each}
      </ul>
    </aside>

    <main class="workbench">
      {#if selectedLesson}
        <section class="lesson-pane">
          <h2>{selectedLesson.title}</h2>
          <Theory markdown={selectedLesson.theory} />
        </section>

        <section class="editor-pane">
          <div class="pane-toolbar">
            <button class="btn" onclick={handleRun} disabled={actionState.running}>
              {actionState.running ? "Выполняется…" : "Запустить"}
            </button>
            <button class="btn" onclick={handleCheck} disabled={actionState.checking}>
              {actionState.checking ? "Проверяем…" : "Проверить"}
            </button>
          </div>
          <div class="editor-container">
            <CodeEditor bind:code />
          </div>
        </section>

        <section class="output-pane">
          {#if output}
            <pre class="output">{output}</pre>
          {:else}
            <p class="pane-placeholder">Вывод исполнителя кода появится здесь.</p>
          {/if}
        </section>
      {:else}
        <section class="empty-pane">
          <p class="pane-placeholder">В этом треке пока нет уроков.</p>
        </section>
      {/if}
    </main>
  {/if}
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

  .sidebar-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .btn-ghost {
    flex: 1;
    color: var(--fg);
    background: none;
    border-color: var(--border);
    padding: 4px 8px;
    font-size: 0.8rem;
  }

  .btn-ghost:hover {
    background: var(--nav-hover);
  }

  .notice {
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
font-size: 0.9rem;
  }

  .sidebar-heading {
    margin: 12px 0 6px;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }

  .btn-back {
    width: 100%;
    margin: 4px 0 12px;
    color: var(--fg);
    background: none;
    border-color: var(--border);
    padding: 4px 8px;
    font-size: 0.8rem;
    text-align: left;
  }

  .btn-back:hover {
    background: var(--nav-hover);
  }

  .muted-note {
    font-size: 0.85rem;
    color: var(--muted);
    line-height: 1.4;
  }

  .track-picker {
    flex: 1;
    padding: 24px 32px;
    overflow-y: auto;
  }

  .track-picker-title {
    margin: 8px 0 4px;
    font-size: 1.5rem;
  }

  .track-picker-subtitle {
    margin: 0 0 20px;
    color: var(--muted);
    max-width: 560px;
  }

  .track-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
    max-width: 900px;
  }

  .track-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--fg);
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: box-shadow 0.12s ease;
  }

  .track-card:hover {
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  }

  .track-card-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--title-fg);
  }

  .track-card-desc {
    font-size: 0.9rem;
    line-height: 1.5;
    color: var(--muted);
  }

  .track-card-badge {
    align-self: flex-start;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--border);
    color: var(--muted);
  }

  .empty-pane {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border);
    border-radius: 8px;
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
    padding: 0;
    border-radius: 6px;
  }

  .nav-item.active {
    outline: 1px solid var(--border);
    background: var(--nav-hover);
  }

  .nav-button {
    display: block;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: 6px;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .nav-button:hover {
    background: var(--nav-hover);
  }

  .nav-done {
    color: var(--title-fg);
    font-weight: 700;
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

  .editor-pane {
    display: flex;
    flex-direction: column;
  }

  .editor-container {
    flex: 1;
    min-height: 0;
    border-radius: 6px;
    overflow: hidden;
  }

  .output {
    margin: 0;
    padding: 10px;
    border-radius: 6px;
    background: #0d1117;
    color: #c9d1d9;
    font-family: "JetBrains Mono", "Cascadia Code", Consolas, monospace;
    font-size: 0.85rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .pane-placeholder {
    margin: 0;
    color: var(--muted);
    font-style: italic;
  }
</style>
