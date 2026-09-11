import { Mutex } from 'async-mutex';
import { v4 as uuidv4 } from 'uuid';
export default class Scheme {
    running = false;
    worker;
    // Options
    WORKER_URL;
    STDIN_MAX_PACKET_SIZE;
    STDOUT_INITIAL_PACKET_SIZE;
    error;
    // Writing
    stdinDataAvailable;
    stdinDataRequested;
    stdinDataSize;
    stdinData;
    // Reading
    stdoutBufferCursor = 0;
    stdoutBuffer;
    stderrBufferCursor = 0;
    stderrBuffer;
    prompt = '>';
    constructor({ 
    /**
     * In some cases you may need to use a custom worker,
     * especially when dealing with certain bundlers.
     * Generally you will want this worker to be a simple wrapper
     * around using importing the original worker.
     */
    workerUrl = undefined, stdinMaxPacketSize = 256, stdoutInitialPacketSize = 256, error = console.error, } = {}) {
        this.WORKER_URL = workerUrl;
        this.STDIN_MAX_PACKET_SIZE = stdinMaxPacketSize;
        this.STDOUT_INITIAL_PACKET_SIZE = stdoutInitialPacketSize;
        this.error = error;
    }
    async init() {
        if (this.running) {
            throw new Error('Scheme is already running. If you want to restart Scheme, call destroy() first.');
        }
        const sharedStdinBuffer = new SharedArrayBuffer(4 + 2 + this.STDIN_MAX_PACKET_SIZE * 2);
        this.worker = new Worker(this.WORKER_URL ?? new URL('./worker.js', import.meta.url), { type: 'module' });
        // First four bytes are our lock
        this.stdinDataAvailable = new Int32Array(sharedStdinBuffer, 0, 1);
        this.stdinDataAvailable[0] = 1;
        // Next four indicate whether stdin is needed
        this.stdinDataRequested = new Int32Array(sharedStdinBuffer, 4, 1);
        // Next two are the payload size
        this.stdinDataSize = new Int16Array(sharedStdinBuffer, 8, 1);
        // Rest is the payload
        this.stdinData = new Int8Array(sharedStdinBuffer, 10);
        this.setupOutputBuffers();
        this.worker.addEventListener('message', (ev) => {
            const { type, data } = ev.data;
            switch (type) {
                case 'stdout':
                    this.readOut(data);
                    break;
                case 'stderr':
                    this.readErr(data);
                    break;
                case 'exit':
                    this.destroy();
            }
        });
        this.worker.postMessage({
            sharedStdinBuffer,
            argv: [],
        });
        this.running = true;
        await this.waitForStdinRequestOrStop();
        const output = this.getOutput()[0];
        await this.runExpression(`
            (waiter-prompt-string "${this.prompt = uuidv4()}")
            (define waiter-prompt-string
                (case-lambda
                    [() ">"]
                    [(s) (error 'waiter-prompt-string "The prompt cannot be changed.")]))
            `);
        return output;
    }
    runExpressionMutex = new Mutex();
    async runExpression(expr) {
        if (!this.running) {
            throw new Error('Cannot run an expression before calling init()');
        }
        return this.runExpressionMutex.runExclusive(async () => {
            this.stdoutBuffer = new Uint8Array(this.STDOUT_INITIAL_PACKET_SIZE);
            this.stderrBuffer = new Uint8Array(this.STDOUT_INITIAL_PACKET_SIZE);
            this.stdoutBufferCursor = 0;
            this.stderrBufferCursor = 0;
            await this.sendString(expr);
            // Ensure all of the output has printed
            await this.waitForStdinRequestOrStop();
            return this.getOutput();
        });
    }
    setupOutputBuffers() {
        this.stdoutBuffer = new Uint8Array(this.STDOUT_INITIAL_PACKET_SIZE);
        this.stderrBuffer = new Uint8Array(this.STDOUT_INITIAL_PACKET_SIZE);
        this.stdoutBufferCursor = 0;
        this.stderrBufferCursor = 0;
    }
    getOutput() {
        const output = new TextDecoder().decode(this.stdoutBuffer.slice(0, this.stdoutBufferCursor));
        const err = new TextDecoder().decode(this.stderrBuffer.slice(0, this.stderrBufferCursor));
        if (err) {
            this.error(err);
        }
        return output.split(new RegExp(`\\n?${this.prompt} `)).filter(Boolean);
    }
    waitingForStdin() {
        return Atomics.load(this.stdinDataRequested, 0) === 1;
    }
    async waitForStdinRequestOrStop() {
        if (this.waitingForStdin() || !this.running) {
            return;
        }
        return new Promise(resolve => {
            const pollingInterval = setInterval(() => {
                console.log('polling');
                if (this.waitingForStdin()) {
                    clearInterval(pollingInterval);
                    resolve();
                }
            }, 50);
        });
    }
    async sendString(text) {
        const stdinBuf = new TextEncoder().encode(text + '\n\0');
        for (let stdinOffset = 0; stdinOffset < stdinBuf.length; stdinOffset += this.STDIN_MAX_PACKET_SIZE) {
            await this.waitForStdinRequestOrStop();
            if (!this.running) {
                // Abort
                return;
            }
            const packetSize = Math.min(this.STDIN_MAX_PACKET_SIZE, stdinBuf.length - stdinOffset);
            // Load data
            Atomics.store(this.stdinDataSize, 0, packetSize);
            for (let i = 0; i < packetSize; i++) {
                this.stdinData[i] = stdinBuf[stdinOffset + i];
            }
            // Set data available and notify worker
            Atomics.store(this.stdinDataRequested, 0, 0);
            Atomics.store(this.stdinDataAvailable, 0, 1);
            Atomics.notify(this.stdinDataAvailable, 0);
        }
    }
    readOut(char) {
        if (this.stdoutBuffer) {
            if (this.stdoutBufferCursor >= this.stdoutBuffer.length) {
                const newBuf = new Uint8Array(this.stdoutBuffer.length * 2);
                newBuf.set(this.stdoutBuffer);
                this.stdoutBuffer = newBuf;
            }
            this.stdoutBuffer[this.stdoutBufferCursor++] = char;
        }
    }
    readErr(char) {
        if (this.stderrBuffer) {
            if (this.stderrBufferCursor >= this.stderrBuffer.length) {
                const newBuf = new Uint8Array(this.stderrBuffer.length * 2);
                newBuf.set(this.stderrBuffer);
                this.stderrBuffer = newBuf;
            }
            this.stderrBuffer[this.stderrBufferCursor++] = char;
        }
    }
    destroy() {
        this.worker?.terminate();
        this.running = false;
    }
}
