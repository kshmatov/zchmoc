const PREAMBLE = `
(define (zchm->string x)
  (call-with-string-output-port (lambda (p) (write x p))))
(define zchm-checks 0)
(define zchm-failures 0)
(define (zchm-ok! name)
  (set! zchm-checks (+ zchm-checks 1)))
(define (zchm-bad! name detail)
  (set! zchm-checks (+ zchm-checks 1))
  (set! zchm-failures (+ zchm-failures 1))
  (display "FAIL: ")
  (display name)
  (when detail
    (display " — ")
    (display detail))
  (newline))
(define (zchm-check name cond)
  (if cond (zchm-ok! name) (zchm-bad! name #f)))
(define (zchm-check-equal name got want)
  (if (equal? got want)
      (zchm-ok! name)
      (zchm-bad! name
                 (string-append "ожидалось "
                                (zchm->string want)
                                ", получено "
                                (zchm->string got)))))
(define (zchm-capture-output thunk)
  (let ((port (open-output-string)))
    (let ((old (current-output-port)))
      (current-output-port port)
      (let ((result (thunk)))
        (current-output-port old)
        result))
    (get-output-string port)))
(define (zchm-contains? s sub)
  (let ((n (string-length s)) (m (string-length sub)))
    (let loop ((i 0))
      (cond ((= m 0) #t)
            ((>= i n) #f)
            ((and (<= (+ i m) n)
                  (string=? (substring s i (+ i m)) sub))
             #t)
            (else (loop (+ i 1)))))))
(define (zchm-finish)
  (display "__ZCHM__ ")
  (display (if (> zchm-failures 0) "FAIL " "PASS "))
  (display zchm-failures)
  (display "/")
  (display zchm-checks)
  (newline))
(define (zchm-except e)
  (define msg (condition-message e))
  (define detail
    (if msg
        (guard (err (#t #f))
          (let ((args (condition-irritants e)))
            (if (pair? args)
                (apply format #f msg args)
                msg)))
        #f))
  (zchm-bad! "исключение при проверке"
             (if detail detail (zchm->string e))))
`;

export interface TestReport {
  passed: boolean;
  failedCount: number;
  count: number;
  failures: string[];
}

export function buildTestProgram(playerCode: string, testsCode: string): string {
  return `(let () ${PREAMBLE}
  (guard (e [#t (zchm-except e) (zchm-finish)])
    ${playerCode}
    ${testsCode}
    (zchm-finish)))`;
}

const RESULT_RE = /__ZCHM__\s+(PASS|FAIL)\s+(\d+)\/(\d+)/;
const FAILURE_RE = /^FAIL: (.*)$/gm;

export function parseTestReport(output: string): TestReport | null {
  const match = RESULT_RE.exec(output);
  if (!match) return null;
  const failedCount = Number(match[2]);
  const count = Number(match[3]);
  const failures: string[] = [];
  for (const lineMatch of output.matchAll(FAILURE_RE)) {
    failures.push(lineMatch[1]);
  }
  return {
    passed: match[1] === "PASS",
    failedCount,
    count,
    failures,
  };
}