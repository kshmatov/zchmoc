# zchemer

Образовательная игра, обучающая языку Scheme в стандарте R6RS. Игрок проходит базу языка, затем выбирает один из продвинутых треков-проектов.

Стек: **Tauri 2** (десктоп) + **SvelteKit** (интерфейс) + **TypeScript** + **CodeMirror 6** (редактор кода, подключается позже) + **Chez Scheme** (исполнитель кода: WASM для базы, sidecar для треков-проектов).

## Требования

- [Node.js](https://nodejs.org/) ≥ 22
- [Rust](https://www.rust-lang.org/) ≥ 1.98 (cargo)
- Windows: установленный WebView2 (обычно предустановлен)

## Запуск в разработке

```
npm install
npm run tauri dev
```

Откроется десктопное окно с интерфейсом-заглушкой.

## Сборка релиза

```
npm run tauri build
```

Результат появится в `src-tauri/target/release/bundle/` (MSI и NSIS-установщики).

## Проверка кода

```
npm run check      # типчекинг Svelte/TS
cargo check        # проверка Rust-части (в src-tauri)
```

## Структура

- `src/` — фронтенд (SvelteKit, статичная адаптация для Tauri)
- `src-tauri/` — десктопная оболочка (Rust/Tauri 2)
- `docs/` — ADR и настройка агентских навыков
- `CONTEXT.md` — глоссарий проекта
