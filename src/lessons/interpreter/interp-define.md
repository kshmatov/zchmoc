---
id: interp-define
title: "Урок 7. define и рекурсия"
track: interpreter
order: 7
skills:
  - define
  - recursion
---

## define

Спецформа `define` связывает имя со значением в текущем окружении:

```scheme
(define x 10)
(define (square n) (* n n))
```

Синтаксический сахар `(define (f a b) тело)` равнозначен:

```scheme
(define f (lambda (a b) тело))
```

В нашем интерпретаторе `define` — просто ещё одна спецформа: держим `car` списка (имя), вычисляем/создаём значение и кладём связь в окружение через готовый `env-set!`.

## Рекурсия

Окружение — та же «ячейка», которую `define` пополняет. Когда мы определяем процедуру, новая связь появляется в окружении *замыкания*. Значит, внутри тела процедура видит саму себя — работает **рекурсия**:

```scheme
(define (fact n)
  (if (= n 0) 1 (* n (fact (- n 1)))))
```

Соберём всё. Наш интерпретатор теперь умеет вычислять атомы, списки, условия, блоки, вызовы, функции и определения. Это полноценное подмножество Scheme!

## Задание

Допиши спецформу `define` в `interp`. Поддержку замыканий (`apply-closure`, `interp-app`, `lambda`) возьми из предыдущего урока.

---starter
; Интерпретатор · Урок 7 — define и рекурсия

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

; Применить замыкание: надстроить слой связей и вычислить тело.
(define (apply-closure cl values env)
  (let ((params (cadr cl)) (body (caddr cl)) (cenv (cadddr cl)))
    (let ((new-env (list (append (map cons params values) (car cenv)))))
      (interp body new-env))))

(define (interp-app op args env)
  (let ((fn (interp op env))
        (vals (map (lambda (a) (interp a env)) args)))
    (if (and (pair? fn) (eq? (car fn) 'closure))
        (apply-closure fn vals env)
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
          (list 'closure (car args) (cadr args) env))
         ;; ЗАДАНИЕ: give an alias — define
         ((eq? op 'define)
          (error 'interp "ЗАДАНИЕ: свяжи имя со значением через env-set!"))
         (else (interp-app op args env)))))))
---tests
(let ((env (base-env)))
  (interp '(define x 10) env)
  (zchm-check-equal "define число" (interp 'x env) 10))

(let ((env (base-env)))
  (interp '(define (double n) (* n 2)) env)
  (zchm-check-equal "define функция (сахар)" (interp '(double 21) env) 42))

(let ((env (base-env)))
  (interp '(define (fact n) (if (= n 0) 1 (* n (fact (- n 1))))) env)
  (zchm-check-equal "рекурсивный факториал" (interp '(fact 5) env) 120))