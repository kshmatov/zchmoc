import loadScheme from './chez/scheme.js';
addEventListener('message', async (ev) => {
    const { sharedStdinBuffer, argv } = ev.data;
    // First four bytes are our stdin lock
    const stdinDataAvailable = new Int32Array(sharedStdinBuffer, 0, 1);
    // Next four indicate whether stdin is needed
    const stdinDataRequested = new Int32Array(sharedStdinBuffer, 4, 1);
    // Next two are the payload size
    const stdinDataSize = new Int16Array(sharedStdinBuffer, 8, 1);
    // Rest is the payload
    const stdinData = new Int8Array(sharedStdinBuffer, 10);
    const stdinBuffer = [];
    function flushStdin() {
        stdinBuffer.push(...stdinData.slice(0, stdinDataSize[0]));
    }
    function readCharFromStdinBuffer() {
        const char = stdinBuffer.shift();
        return char;
    }
    const Module = {
        arguments: argv,
        stdin() {
            if (stdinBuffer.length > 0) {
                return readCharFromStdinBuffer() || null;
            }
            while (stdinBuffer.length === 0) {
                // Request data
                Atomics.store(stdinDataRequested, 0, 1);
                // Sleep while no data is available
                Atomics.wait(stdinDataAvailable, 0, 0);
                flushStdin();
                // Once data is consumed, unset the data available flag
                Atomics.store(stdinDataAvailable, 0, 0);
            }
            return readCharFromStdinBuffer() || null;
        },
        stdout(char) {
            postMessage({ type: 'stdout', data: char });
        },
        stderr(char) {
            postMessage({ type: 'stderr', data: char });
        },
        onExit() {
            postMessage({ type: 'exit' });
        }
    };
    loadScheme(Module);
    const FS = Module.FS;
    function createDir(dirname) {
        const pathParts = dirname.split('/');
        if (pathParts[0] === '') {
            pathParts.shift();
            pathParts[0] = `/${pathParts[0] ?? ''}`;
        }
        let path = '';
        for (const part of pathParts) {
            path += '/' + part;
            try {
                FS.stat(path);
            }
            catch (e) {
                FS.mkdir(path);
            }
        }
    }
    function loadFile(fsPath, data) {
        createDir(fsPath.replace(/\/[^/]*\/?$/, '') || '/');
        const mode = Module.FS_getMode(true, true);
        const node = FS.create(fsPath, mode);
        FS.chmod(node, mode | 146);
        const stream = FS.open(node, 577);
        FS.write(stream, data, 0, data.length, 0, true);
        FS.close(stream);
        FS.chmod(node, mode);
    }
    async function preloadFile(fsPath, url) {
        const addRunDependency = Module.addRunDependency;
        const removeRunDependency = Module.removeRunDependency;
        const depName = `preloadFile ${fsPath}`;
        addRunDependency(depName);
        loadFile(fsPath, new Uint8Array(await (await fetch(url.toString())).arrayBuffer()));
        removeRunDependency(depName);
    }
    Module.preRun = () => {
        preloadFile('/petite.boot', new URL('./chez/petite.boot', import.meta.url));
        // preloadFile('/scheme.boot', new URL('./chez/scheme.boot', import.meta.url));
    };
});
