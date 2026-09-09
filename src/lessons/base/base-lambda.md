---
id: base-lambda
title: "Урок 8. Анонимные процедуры"
track: base
order: 8
skills:
  - lambda
  - closures
---

`define` даёт процедуре имя. Но процедура — это **значение**, и его можно создавать без имени, прямо на месте.

## lambda

`(lambda (x) ...)` — анонимная процедура. Вызвать её можно сразу:

```scheme
((lambda (x) (* x x)) 5)   ; 25
```

Почти всегда удобнее дать имя, но анонимные процедуры незаменимы, когда процедура нужна «здесь и сейчас» — например, чтобы передать другой процедуре.

## Процедуры как аргументы

Процедура — обычное значение, поэтому её можно передавать, хранить, возвращать:

```scheme
(define double (lambda (x) (* x 2)))

(define (compose f g)
  (lambda (x) (f (g x))))

(define dinc (compose double (lambda (x) (+ x 1))))
(dinc 3)   ; 8 — сначала (+ 3 1), потом (* 2 4)
```

## Замыкания

Процедура, созданная внутри другой, **захватывает** окружение: она продолжает видеть переменные места, где была создана, даже после того как то место завершило работу.

```scheme
(define (make-adder n)
  (lambda (x) (+ x n)))   ; n захвачена из окружения make-adder

(define add5 (make-adder 5))
(add5 10)   ; 15
```

Каждый вызов `make-adder` создаёт **свою** копию `n` — замыкания `add5` и `add10` не мешают друг другу.

## Задание

Напиши две процедуры: счётчик-прибавитель и композицию.

---starter
; Урок 8 · Анонимные процедуры
;
; ЗАДАНИЕ 1: (make-adder n) — возвращает процедуру, которая прибавляет
; n к своему аргументу. Используй lambda: она «запомнит» своё значение n.
;
; ЗАДАНИЕ 2: (compose f g) — возвращает процедуру, которая сначала
; применяет g к своему аргументу, затем f к результату: (f (g x)).

(define (make-adder n)
  (error 'base "ЗАДАНИЕ: верни процедуру, прибавляющую n"))

(define (compose f g)
  (error 'base "ЗАДАНИЕ: верни процедуру f(g(x))"))
---tests
(define add5 (make-adder 5))
(define add10 (make-adder 10))
(define double (lambda (x) (* x 2)))
(define inc (lambda (x) (+ x 1)))
(define dinc (compose double inc))

(zchm-check-equal "add5 прибавляет 5" (add5 10) 15)
(zchm-check-equal "add10 работает отдельно" (add10 1) 11)
(zchm-check-equal "каждое замыкание хранит своё n" (add5 0) 5)
(zchm-check "make-adder вернул процедуру" (procedure? add5))
(zchm-check-equal "compose: double(inc(3))" (dinc 3) 8)
(zchm-check "compose вернул процедуру" (procedure? dinc))