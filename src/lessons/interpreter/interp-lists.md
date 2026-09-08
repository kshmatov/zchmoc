---
id: interp-lists
title: "Урок 3. Списки и quote"
track: interpreter
order: 3
skills:
  - lists
  - quote
---

## Списки

Данные в Scheme часто бывают списками. Список — это цепочка пар: первые два элемента пары — голова и хвост, а пустой список `'()` завершает цепочку.

```scheme
(cons 1 (cons 2 '())) ; → (1 2)
```

Наш интерпретатор оперирует списками, но список хочется воспринимать как *данные*, а не как *вызов*. Спецформа `quote` поставляет список «как есть», без вычисления:

```scheme
'42      ; → 42
'(1 2 3) ; → (1 2 3)
(quote (1 2 3)) ; то же самое
```

В языке формула `'(1 2 3)` — это синтаксический сахар для `(quote (1 2 3))`. Обрати внимание: `quote` — первая спецформа нашего интерпретатора. При вычислении она берёт один аргумент и возвращает его **без вычисления**.

## Задание

Урок уже включает список, который интерпретатор умеет различать по предикату `pair?`. Твоя задача: если выражение — список с первым элементом `quote`, вернуть второй элемент списка как данные. Воспользуйся готовым шаблоном.

---starter
; Интерпретатор · Урок 3 — Списки и quote

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

; ЗАДАНИЕ: если (car expr) — символ quote, верни данные из (cadr expr).
(define (interp expr env)
  (cond
    ((number? expr) expr)
    ((string? expr) expr)
    ((boolean? expr) expr)
    ((symbol? expr) (env-get env expr))
    ((not (pair? expr)) (error 'interp "непонятное выражение" expr))
    ((eq? (car expr) 'quote) (error 'interp "ЗАДАНИЕ: верни (cadr expr)"))
    (else (error 'interp "пока умеем только quote"))))
---tests
(zchm-check-equal "quote числа" (interp '(quote 42) (make-env)) 42)
(zchm-check-equal "quote списка" (interp '(quote (1 2 3)) (make-env)) '(1 2 3))
(zchm-check-equal "вложенный список" (interp '(quote (a (b c))) (make-env)) '(a (b c)))
(zchm-check-equal "пустой список" (interp '(quote ()) (make-env)) '())