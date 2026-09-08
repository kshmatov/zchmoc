---
id: interp-lambda
title: "Урок 6. lambda и замыкания"
track: interpreter
order: 6
skills:
  - closures
  - lambda
---

## lambda

Процедуры в нашем интерпретаторе создаются спецформой `lambda`:

```scheme
(lambda (x) (+ x 1))
```

Это выражение **не вычисляет тело сразу** — оно создаёт **замыкание**: значение, которое запоминает параметры, тело и окружение, в котором лямбда была создана.

## Замыкание

Замыкание хранит три вещи:

- параметры — список имён;
- тело — выражение;
- окружение — ссылку на *то окружение, где лямбда определена*.

Когда замыкание вызывается, параметры подставляются: над окружением замыкания надстраивается слой со связями `имя → значение аргумента`. Затем вычисляется тело.

Наш интерпретатор представит замыкание списком:

```scheme
(closure параметры тело окружение)
```

`closure` — просто маркер-символ, по которому мы отличаем замыкание от данных.

## Вызов замыкания

В вызове `((lambda (x) (+ x 1)) 41)` оператор — это лямбда-выражение. Его надо вычислить (получится замыкание), затем применить. Обрабатывать замыкания будем в `interp-app`: если процедура — наша замыкание (`closure`), подставим параметры и вычислим тело; иначе (встроенная Scheme-процедура) — применим напрямую.

## Задание

Допиши обращение с замыканиями: спецформу `lambda` и применение `closure` в `interp-app`.

---starter
; Интерпретатор · Урок 6 — lambda и замыкания

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

; ЗАДАНИЕ: применить замыкание (closure params body env).
; Надстрой над окружением замыкания слой новых связей и вычисли тело.
(define (apply-closure cl values env)
  (error 'interp "ЗАДАНИЕ: привяжи параметры и вычисли тело"))

; ЗАДАНИЕ: если оператор — замыкание, примени apply-closure,
; иначе — обычная Scheme-процедура встроенных.
(define (interp-app op args env)
  (let ((fn (interp op env))
        (vals (map (lambda (a) (interp a env)) args)))
    (if (and (pair? fn) (eq? (car fn) 'closure))
        (error 'interp "ЗАДАНИЕ: вызов замыкания")
        (apply fn vals))))

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
         ((eq? op 'lambda)
          (error 'interp "ЗАДАНИЕ: создай замыкание"))
         (else (interp-app op args env)))))))
---tests
(zchm-check-equal "замыкание вызывается один раз" (interp '((lambda (x) (+ x 1)) 41) (base-env)) 42)
(zchm-check-equal "замыкание с capture" (interp '((lambda (x) (* x x)) 6) (base-env)) 36)
(zchm-check-equal "встроенные остаются" (interp '(+ 20 22) (base-env)) 42)
(zchm-check-equal "begin в лямбде" (interp '((lambda (x) (begin (+ x 1) (* x 2))) 10) (base-env)) 20)