---
id: conc-queue
title: "Урок 6. Ограниченный буфер"
track: concurrency
order: 6
skills:
  - mutex
  - condition-variables
  - threads
---

## Итоговый проект

Соберём из пройденного кусочек реальной системы — **ограниченный буфер**. Это очередь с максимальной вместимостью: когда буфер полон, производитель обязан ждать; когда пуст — ждёт потребитель.

Такой буфер — сердце задач вроде «пул работников», «очередь задач» и «конвейер обработки». Здесь используются все примитивы трека:

- `fork-thread` / `thread-join` — производитель и потребитель работают параллельно;
- `make-mutex` и `with-mutex` — защищают очередь;
- две условные переменные — `not-full` (продюсер ждёт освобождения места) и `not-empty` (потребитель ждёт элемент).

## Распределитель

`make-bounded-queue` возвращает процедуру-распределитель, которую вызывают с ключом операции:

```scheme
(define q (make-bounded-queue 2))

(q 'put! 42)   ; положить элемент 42
(q 'take!)     ; забрать элемент
(q 'count)     ; сколько сейчас элементов
```

Производитель кладёт, пока есть место; если буфер полон — ждёт `not-full`. Потребитель забирает, пока есть элементы; если пусто — ждёт `not-empty`. И каждый «забирающий» освободившееся место будит заждавшегося производителя.

## Задание

Дозаполни `make-bounded-queue`: производитель должен ждать свободного места (`condition-wait not-full m`), когда буфер полон, а потребитель — ждать элемента (`condition-wait not-empty m`), когда буфер пуст.

---starter
; Многозадачность · Урок 6 — Ограниченный буфер
;
; ЗАДАНИЕ: в операции put! при полном буфере подожди, пока освободится
; место (condition-wait not-full m); в операции take! при пустом буфере
; подожди, пока появится элемент (condition-wait not-empty m).

(define (make-bounded-queue capacity)
  (let ((items '())
        (m (make-mutex))
        (not-full (make-condition))
        (not-empty (make-condition)))
    (lambda (op . args)
      (case op
        ((put!)
         (with-mutex m
           (let wait ()
             (when (>= (length items) capacity)
               (error 'conc "ЗАДАНИЕ: подожди, пока буфер не освободится")
               (wait)))
           (set! items (cons (car args) items))
           (condition-signal not-empty)))
        ((take!)
         (with-mutex m
           (let wait ()
             (when (null? items)
               (error 'conc "ЗАДАНИЕ: подожди, пока появится элемент")
               (wait)))
           (let ((x (car items)))
             (set! items (cdr items))
             (condition-signal not-full)
             x)))
        ((count) (with-mutex m (length items)))
        (else (error 'queue "неизвестная операция" op))))))
---tests
(define q (make-bounded-queue 2))
(define sum 0)
(define acc-m (make-mutex))

(define producer
  (fork-thread
    (lambda ()
      (do ((i 1 (+ i 1))) ((> i 10))
        (q 'put! i)))))

(define consumer
  (fork-thread
    (lambda ()
      (let loop ((k 0))
        (when (< k 10)
          (let ((x (q 'take!)))
            (with-mutex acc-m (set! sum (+ sum x)))
            (loop (+ k 1))))))))

(thread-join producer)
(thread-join consumer)

(zchm-check-equal "все десять элементов доставлены" sum 55)
(zchm-check-equal "буфер опустел, производитель не потерял ничего" (q 'count) 0)