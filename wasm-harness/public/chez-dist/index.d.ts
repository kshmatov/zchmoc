export default class Scheme {
    running: boolean;
    private worker?;
    private readonly WORKER_URL?;
    private readonly STDIN_MAX_PACKET_SIZE;
    private readonly STDOUT_INITIAL_PACKET_SIZE;
    private readonly error;
    private stdinDataAvailable;
    private stdinDataRequested;
    private stdinDataSize;
    private stdinData;
    private stdoutBufferCursor;
    private stdoutBuffer;
    private stderrBufferCursor;
    private stderrBuffer;
    private prompt;
    constructor({ 
    /**
     * In some cases you may need to use a custom worker,
     * especially when dealing with certain bundlers.
     * Generally you will want this worker to be a simple wrapper
     * around using importing the original worker.
     */
    workerUrl, stdinMaxPacketSize, stdoutInitialPacketSize, error, }?: {
        workerUrl?: string | URL | undefined;
        stdinMaxPacketSize?: number | undefined;
        stdoutInitialPacketSize?: number | undefined;
        error?: ((message: string) => void) | undefined;
    });
    init(): Promise<string>;
    private runExpressionMutex;
    runExpression(expr: string): Promise<string[]>;
    private setupOutputBuffers;
    private getOutput;
    private waitingForStdin;
    private waitForStdinRequestOrStop;
    private sendString;
    private readOut;
    private readErr;
    destroy(): void;
}
