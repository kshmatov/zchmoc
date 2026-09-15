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
    // Синтаксическая ошибка или «тихий» сбой (незакрытые скобки, когда REPL
    // молча проглатывает незавершённое выражение) могут нарушить состояние
    // REPL — пересоздаём исполнитель, чтобы следующий запуск стартовал
    // с чистого листа. При этом «выражение выполнено, но вывода нет» (например,
    // `define` или `string->number`, вернувший #f) REPL не отравляет —
    // определения сохраняются между запусками.
    const unbalanced = !isBalancedScheme(source);
    const unstable = error.trim() !== "" || unbalanced;
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

/**
 * Проверяет баланс скобок `() [] {}` в Scheme-коде. Использование одно и то же
 * для REPL: незакрытое выражение заставляет REPL молча ждать продолжения, а это
 * ломает последующие запуски. Кавычки, строки, символьные и разные комментарии
 * скобки не считают.
 */
export function isBalancedScheme(source: string): boolean {
  const stack: string[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === ";") {
      i = skipToEndOfLine(source, i);
    } else if (c === "#" && source[i + 1] === "|") {
      i = skipBlockComment(source, i);
    } else if (c === "#" && source[i + 1] === "\\") {
      i = Math.min(source.length, i + 3);
    } else if (c === '"') {
      i = skipStringLiteral(source, i);
    } else if (c === "(" || c === "[" || c === "{") {
      stack.push(c);
      i++;
    } else if (c === ")" || c === "]" || c === "}") {
      const open = c === ")" ? "(" : c === "]" ? "[" : "{";
      if (stack.pop() !== open) {
        return false;
      }
      i++;
    } else {
      i++;
    }
  }
  return stack.length === 0;
}

function skipToEndOfLine(source: string, start: number): number {
  const nl = source.indexOf("\n", start);
  return nl === -1 ? source.length : nl + 1;
}

function skipBlockComment(source: string, start: number): number {
  const end = source.indexOf("|#", start + 2);
  return end === -1 ? source.length : end + 2;
}

function skipStringLiteral(source: string, start: number): number {
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === "\\") {
      i++;
    } else if (source[i] === '"') {
      return i + 1;
    }
  }
  return source.length;
}