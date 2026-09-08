---
id: interp-call
title: "Урок 5. Вызовы процедур"
track: interpreter
order: 5
skills:
  - application
  - builtins
---

## Вызов процедуры

Настоящая сила появляется, когда интерпретатор умеет **вызывать процедуры**. Запись `(f a1 a2)` внутри нашего интерпретатора — это вызов процедуры `f` с аргументами `a1` и `a2`.

Как это работает:

1. Вычисли оператор `f` — получим процедуру.
2. Вычисли каждый аргумент `a1`, `a2`, … — получим значения.
3. Примени Procedure к значениям.

Встроенные процедуры (`+`, `-`, `*`, `cons`, …) — обычные процедуры Scheme. Положим их в начальное окружение. `interp` при встрече символа найдёт их в окружении, а при встрече списка-вызова применит.

```scheme
(interp '(+ 1 2) (base-env)) ; → 3
(interp '(cons 1 '(2 3)) (base-env)) ; → (1 2 3)
```

## Порядок вычисления

Сначала вычисляются аргументы, затем применяется процедура. Такой порядок называется **аппликативным**. Проверь на примере: `(interp '(* 2 (+ 1 1)) (base-env))`.

## Задание

Реализуй применение процедуры. Список-вызов распознаётся в `else`-ветке последнего `cond`. У тебя есть оператор `(car expr)` и аргументы `(cdr expr)`.

---starter
; Интерпретатор · Урок 5 — Вызовы процедур

(define (make-env) (list '()))
(define (env-set! env name value)
  (let ((p (assq name (car env))))
    (if p
        (set-cdr! p value)
        (set-car! env (cons (cons name value) (car env))))))
(define (env-get env name)
  (let ((p (assq name (car env))))
    (if p
        (cdr p)
        (error 'interp "не определено" name))))

; Начальное окружение с встроенными процедурами.
(define (base-env)
  (let ((e (make-env)))
    (env-set! e '+ +)
    (env-set! e '- -)
    (env-set! e '* *)
    (env-set! e '= =)
    (env-set! e '< <)
    (env-set! e 'cons cons)
    (env-set! e 'car car)
    (env-set! e 'cdr cdr)
    (env-set! e 'pair? pair?)
    (env-set! e 'null? null?)
    (env-set! e 'eq? eq?)
    e))

; ЗАДАНИЕ: вычисли оператор, вычисли аргументы, примени.
; Процедура из значения оператора может быть обычной Scheme-процедурой.
(define (interp-app op args env)
  (error 'interp "ЗАДАНИЕ: interp-app"))

(define (interp expr env)
  (cond
    ((number? expr) expr)
    ((string? expr) expr)
    ((boolean? expr) expr)
    ((symbol? expr) (env-get env expr))
    ((not (pair? expr)) (error 'interp "непонятное выражение" expr))
    ((eq? (car expr) 'quote) (cadr expr))
    (else
     (let ((op (car expr)) (args (cdr expr)))
       (cond
         ((eq? op 'if)
          (let ((tested (interp (car args) env)))
            (if tested
                (interp (cadr args) env)
                (interp (caddr args) env))))
         ((eq? op 'begin)
          (if (null? args)
              (error 'interp "пустой begin")
              (let loop ((rest args))
                (if (null? (cdr rest))
                    (interp (car rest) env)
                    (begin (interp (car rest) env) (loop (cdr rest)))))))
         (else (interp-app op args env)))))))
---tests
(zchm-check-equal "сложение" (interp '(+ 1 2) (base-env)) 3)
(zchm-check-equal "умножение" (interp '(* 3 4) (base-env)) 12)
(zchm-check-equal "вложенный вызов" (interp '(* 2 (+ 1 1)) (base-env)) 4)
(zchm-check-equal "cons строит список" (interp '(cons 1 (quote (2 3))) (base-env)) '(1 2 3))
(zchm-check-equal "car и cdr" (interp '(car (quote (7 8 9))) (base-env)) 7)
(zchm-check-equal "аргумент — результат вызова" (interp '(+ (car (quote (5))) 2) (base-env)) 7)
(zchm-check-equal "сравнение" (interp '(= 2 2) (base-env)) #t)