import loadScheme from "chez-scheme-js/dist/chez/scheme.js";
import petiteBootUrl from "chez-scheme-js/dist/chez/petite.boot?url";

type SchemeModule = {
  arguments: string[];
  stdin: () => number | null;
  stdout: (char: number) => void;
  stderr: (char: number) => void;
  onExit: () => void;
  FS?: {
    stat(path: string): unknown;
    mkdir(path: string): void;
    create(path: string, mode: number): unknown;
    chmod(node: unknown, mode: number): void;
    open(node: unknown, flags: number): unknown;
    write(
      stream: unknown,
      data: Uint8Array,
      offset: number,
      length: number,
      position: number,
      canOwn: boolean
    ): void;
    close(stream: unknown): void;
  };
  FS_getMode?(isRead: boolean, isWrite: boolean): number;
  addRunDependency?(id: string): void;
  removeRunDependency?(id: string): void;
  preRun?: () => void;
};

addEventListener("message", async (ev) => {
  const { sharedStdinBuffer, argv } = ev.data as {
    sharedStdinBuffer: SharedArrayBuffer;
    argv: string[];
  };

  const stdinDataAvailable = new Int32Array(sharedStdinBuffer, 0, 1);
  const stdinDataRequested = new Int32Array(sharedStdinBuffer, 4, 1);
  const stdinDataSize = new Int16Array(sharedStdinBuffer, 8, 1);
  const stdinData = new Int8Array(sharedStdinBuffer, 10);

  const stdinBuffer: number[] = [];

  function flushStdin() {
    stdinBuffer.push(...stdinData.slice(0, stdinDataSize[0]));
  }

  function readCharFromStdinBuffer() {
    return stdinBuffer.shift();
  }

  const Module: SchemeModule = {
    arguments: argv,
    stdin(): number | null {
      if (stdinBuffer.length > 0) {
        return readCharFromStdinBuffer() || null;
      }
      while (stdinBuffer.length === 0) {
        Atomics.store(stdinDataRequested, 0, 1);
        Atomics.wait(stdinDataAvailable, 0, 0);
        flushStdin();
        Atomics.store(stdinDataAvailable, 0, 0);
      }
      return readCharFromStdinBuffer() || null;
    },
    stdout(char: number) {
      postMessage({ type: "stdout", data: char });
    },
    stderr(char: number) {
      postMessage({ type: "stderr", data: char });
    },
    onExit() {
      postMessage({ type: "exit" });
    },
  };

  loadScheme(Module);

  const FS = Module.FS!;

  function createDir(dirname: string) {
    const pathParts = dirname.split("/");
    if (pathParts[0] === "") {
      pathParts.shift();
      pathParts[0] = `/${pathParts[0] ?? ""}`;
    }
    let path = "";
    for (const part of pathParts) {
      path += "/" + part;
      try {
        FS.stat(path);
      } catch {
        FS.mkdir(path);
      }
    }
  }

  function loadFile(fsPath: string, data: Uint8Array) {
    createDir(fsPath.replace(/\/[^/]*\/?$/, "") || "/");
    const mode = Module.FS_getMode!(true, true);
    const node = FS.create(fsPath, mode);
    FS.chmod(node, mode | 146);
    const stream = FS.open(node, 577);
    FS.write(stream, data, 0, data.length, 0, true);
    FS.close(stream);
    FS.chmod(node, mode);
  }

  async function preloadFile(fsPath: string, url: URL) {
    const addRunDependency = Module.addRunDependency!;
    const removeRunDependency = Module.removeRunDependency!;
    const depName = `preloadFile ${fsPath}`;
    addRunDependency(depName);
    loadFile(fsPath, new Uint8Array(await (await fetch(url.toString())).arrayBuffer()));
    removeRunDependency(depName);
  }

  Module.preRun = () => {
    preloadFile("/petite.boot", new URL(petiteBootUrl, import.meta.url));
  };
});