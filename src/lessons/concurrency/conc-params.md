---
id: conc-params
title: "Урок 4. Потоковые параметры"
track: concurrency
order: 4
skills:
  - thread-parameters
---

## Параметры

**Параметр** — глобальная «настройка», которую можно временно переопределить для части программы. В отличие от обычной переменной, переопределение действует только внутри динамической области и автоматически отменяется при выходе из неё:

```scheme
(define verbosity (make-parameter 1))

(verbosity)              ; → 1
(parameterize ((verbosity 3))
  (verbosity))           ; → 3, и только здесь
(verbosity)              ; → 1, снова
```

Обычный параметр один на весь процесс: пока один поток в `parameterize`, другой поток увидит изменённое значение.

## Потоковые параметры

`make-thread-parameter` создаёт параметр, у которого **у каждого потока своя копия значения**. `parameterize`, выполненное в одном потоке, никак не влияет на остальные:

```scheme
(define worker-name (make-thread-parameter 'main))

(fork-thread
  (lambda ()
    (parameterize ((worker-name 'alpha))
      (worker-name))))   ; → alpha в этом потоке
(worker-name)            ; → main в основном потоке
```

Это удобно для «метки» текущего работника: каждый поток знает своё имя и не мешает другим.

## Задание

Определи `run-worker` — процедуру, порождающую поток, который внутри `parameterize ((current-worker name))` возвращает значение параметра и сохраняет его в общий список `results`.

---starter
; Многозадачность · Урок 4 — Потоковые параметры
;
; ЗАДАНИЕ: внутри потока переопредели параметр current-worker на name
; через parameterize и сохрани (current-worker) в общий список results.

(define current-worker (make-thread-parameter 'main))

(define results '())

(define (run-worker name)
  (fork-thread
    (lambda ()
      (let ((label
              (error 'conc "ЗАДАНИЕ: (parameterize ((current-worker name)) (current-worker))")))
        (set! results (cons label results))))))
---tests
(define t1 (run-worker 'alfa))
(define t2 (run-worker 'beta))
(thread-join t1)
(thread-join t2)

(zchm-check "поток записал ярлык alfa" (memq 'alfa results))
(zchm-check "поток записал ярлык beta" (memq 'beta results))

(zchm-check-equal "у основного потока значение не изменилось"
                  (current-worker) 'main)