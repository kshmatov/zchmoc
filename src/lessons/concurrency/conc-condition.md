---
id: conc-condition
title: "Урок 3. Условные переменные"
track: concurrency
order: 3
skills:
  - condition-variables
---

## Ожидание события

Мьютекс защищает данные, но не умеет ждать: поток, которому нечего брать, просто крутится в цикле, сжигая процессорное время. Для ожидания в Scheme есть **условные переменные** (condition variables).

Условная переменная создаётся через `make-condition`. Ждать событие — `condition-wait`, а сообщить о событии — `condition-signal`:

```scheme
(define cv (make-condition))

(condition-signal cv) ; разбудить один ожидающий поток
(condition-wait cv m) ; отпустить мьютекс m и спать, пока не разбудят
```

Важно: `condition-wait` всегда вызывается, когда поток **владеет мьютексом**. Ожидание отпускает мьютекс, давая другим потокам поработать, а при пробуждении снова захватывает его.

## Производитель и потребитель

Классическая задача — очередь, в которую один поток кладёт элементы (`enqueue!`), а другой забирает (`dequeue!`). Если очередь пуста, потребитель должен подождать, а не крутиться вхолостую:

```scheme
(define (enqueue! x)
  (with-mutex m
    (set! queue (append queue (list x)))
    (condition-signal cv)))   ; разбудить потребителя

(define (dequeue!)
  (with-mutex m
    (let wait ()
      (when (null? queue)
        (condition-wait cv m) ; ждать, пока появится элемент
        (wait)))
    (let ((x (car queue)))
      (set! queue (cdr queue))
      x)))
```

Потребитель, проснувшись, проверяет условие ещё раз — это защищает от «потерянных» сигналов.

## Задание

Дозаполни очередь: добавь вызов `condition-signal` в `enqueue!` и `condition-wait` в `dequeue!`.

---starter
; Многозадачность · Урок 3 — Условные переменные
;
; ЗАДАНИЕ: в enqueue! разбуди ожидающего потребителя (condition-signal cv),
; а в dequeue! дождись появления элемента (condition-wait cv m).

(define queue '())
(define m (make-mutex))
(define cv (make-condition))

(define (enqueue! x)
  (with-mutex m
    (set! queue (append queue (list x)))
    (error 'conc "ЗАДАНИЕ: разбуди ожидающего потребителя")))

(define (dequeue!)
  (with-mutex m
    (let wait ()
      (when (null? queue)
        (error 'conc "ЗАДАНИЕ: дождись элемента в очереди")
        (wait)))
    (let ((x (car queue)))
      (set! queue (cdr queue))
      x)))
---tests
(define got '())
(define consumer
  (fork-thread
    (lambda ()
      (set! got (list (dequeue!) (dequeue!))))))

(enqueue! 1)
(enqueue! 2)
(thread-join consumer)

(zchm-check-equal "потребитель забрал оба элемента" got '(1 2))
(zchm-check-equal "очередь опустела" queue '())