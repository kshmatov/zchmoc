import Scheme from "chez-scheme-js";
import workerUrl from "./chez-worker?worker&url";
import { invoke } from "@tauri-apps/api/core";
import type { SchemeRuntime } from "./tracks";

export interface SchemeResult {
  output: string;
  error: string;
}

export interface RunOptions {
  /**
   * WASM — песочница браузера (база, интерпретатор); sidecar — системный Chez
   * для треков с доступом к сети и процессам.
   */
  backend?: SchemeRuntime;
}

const RUN_TIMEOUT_MS = 10000;

let scheme: Scheme | null = null;
let stderrBuffer = "";

async function ensureScheme(): Promise<Scheme> {
  if (scheme === null) {
    stderrBuffer = "";
    scheme = new Scheme({
      workerUrl,
      error: (err: string) => {
        stderrBuffer += err;
      },
    });
    await scheme.init();
  }
  return scheme;
}

async function runSidecar(source: string): Promise<SchemeResult> {
  return invoke<SchemeResult>("run_chez_sidecar", { source });
}

export async function runScheme(
  source: string,
  options: RunOptions = {}
): Promise<SchemeResult> {
  if (options.backend === "sidecar") {
    return runSidecar(source);
  }
  const s = await ensureScheme();
  stderrBuffer = "";
  try {
    // Передаём код в REPL как есть: каждое выражение вычисляется, и его
    // значение выводится, как в интерактивном Chez. Накопление определений
    // между запусками допустимо — повторный `define` в REPL переопределяет связь.
    const results = await withTimeout(
      s.runExpression(source),
      RUN_TIMEOUT_MS,
      "Программа не завершилась за 10 секунд (возможно, незакрытая скобка или бесконечный цикл)."
    );
    const error = stderrBuffer;
    // Синтаксическая ошибка или «тихий» сбой могут нарушить состояние REPL
    // (и следующие запуски станут нечитаемыми) — пересоздаём исполнитель,
    // чтобы следующая проверка всегда стартовала с чистого листа.
    const unstable =
      error.trim() !== "" || (results.length === 0 && error.trim() === "");
    if (unstable && scheme !== null) {
      s.destroy();
      scheme = null;
    }
    return {
      output: results.join("\n"),
      error,
    };
  } catch (err) {
    // A timed-out or crashed REPL must not poison subsequent runs.
    s.destroy();
    scheme = null;
    throw err;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}