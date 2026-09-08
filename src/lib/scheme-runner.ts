import Scheme from "chez-scheme-js";
import workerUrl from "./chez-worker?worker&url";

export interface SchemeResult {
  output: string;
  error: string;
}

export interface RunOptions {
  /**
   * Обрамляет программу в `(let () …)`, чтобы определения не копились в
   * REPL-окружении между запусками (иначе повторное `define` падает).
   */
  isolate?: boolean;
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

export async function runScheme(source: string, options: RunOptions = {}): Promise<SchemeResult> {
  const s = await ensureScheme();
  stderrBuffer = "";
  try {
    const program = options.isolate ? `(let () ${source}\n(void))` : source;
    const results = await withTimeout(
      s.runExpression(program),
      RUN_TIMEOUT_MS,
      "Программа не завершилась за 10 секунд (возможно, незакрытая скобка или бесконечный цикл)."
    );
    return {
      output: results.join("\n"),
      error: stderrBuffer,
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