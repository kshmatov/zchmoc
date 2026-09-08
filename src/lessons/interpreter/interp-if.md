---
id: interp-if
title: "Урок 4. if и begin"
track: interpreter
order: 4
skills:
  - special-forms
  - conditionals
---

## Спецформы

До сих пор список у нас означал вызов. Но `quote` показал исключение: некоторые операторы не вычисляют свои аргументы обычным способом — это **спецформы**.

Настало время двух новых спецформ: `if` и `begin`.

## if

`if` принимает три выражения: условие, ветку «да» и ветку «нет». Вычисляется только одно из них — то, чья ветка выбирается:

```scheme
(if #t 1 2) ; → 1
(if #f 1 2) ; → 2
```

В Scheme все значения, кроме `#f`, считаются «истиной»:

```scheme
(if 42 'a 'b) ; → a
```

## begin

`begin` вычисляет выражения по порядку и возвращает значение последнего:

```scheme
(begin 1 2 3) ; → 3
```

`begin` понадобится, чтобы выполнить несколько действий подряд и взять результат последнего.

## Задание

Допиши ветки `if` и `begin` в интерпретатор. Для `if`: вычисли условие, затем вычисли выбранную ветку. Для `begin`: пройди по аргументам, верни значение последнего. В `cond` аргументы — списки, поэтому `(car expr)` — оператор, а `(cdr expr)` — аргументы.

---starter
; Интерпретатор · Урок 4 — if и begin

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

; ЗАДАНИЕ: добавь ветки для спецформ if и begin.
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
         ;; if: (if условие да нет)
         ((eq? op 'if)
          (error 'interp "ЗАДАНИЕ: вычисли условие, затем выбранную ветку"))
         ;; begin: (begin e1 e2 ...)
         ((eq? op 'begin)
          (error 'interp "ЗАДАНИЕ: верни значение последнего выражения"))
         (else (error 'interp "пока умеем только quote, if и begin")))))))
---tests
(zchm-check-equal "if #t" (interp '(if #t 1 2) (make-env)) 1)
(zchm-check-equal "if #f" (interp '(if #f 1 2) (make-env)) 2)
(zchm-check-equal "if с небулевой истиной" (interp '(if 42 'a 'b) (make-env)) 'a)
(zchm-check-equal "begin с одним выражением" (interp '(begin 5) (make-env)) 5)
(zchm-check-equal "begin возвращает последнее" (interp '(begin 1 2 3) (make-env)) 3)
(zchm-check-equal "quote ещё работает" (interp '(quote (a b)) (make-env)) '(a b))