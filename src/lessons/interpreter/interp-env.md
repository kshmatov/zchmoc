---
id: interp-env
title: "Урок 2. Окружение"
track: interpreter
order: 2
skills:
  - environment
  - symbols
---

## Окружение

В Scheme имена привязываются к значениям. Связь «имя → значение» хранится в **окружении** env.

Окружение — это список пар `(имя . значение)`. Пары удобно искать процедурой `assq`: она принимает имя и список пар и возвращает пару целиком либо `#f`, если имя не найдено.

```scheme
(assq 'x '((x . 42))) ; → (x . 42)
```

В нашем интерпретаторе окружение хранится в «ячейке» — списке из одного элемента, внутри которого лежит сам список пар. Ячейка позволяет менять окружение, не гоняя его через параметры (пригодится для `define` на поздних уроках).

```scheme
(make-env)   ; → (())  — пустое окружение
```

## Работа с окружением

Готовая процедура `env-set!` добавляет или обновляет имя, а `env-get` ищет значение по имени:

```scheme
(env-set! env 'x 42)  ; теперь (interp 'x env) → 42
(env-get env 'x)      ; → 42
```

## Задание

Допиши `env-get`, чтобы она возвращала значение имени из окружения: найди пару через `assq` в списке пар, который лежит внутри ячейки, и верни `cdr` найденной пары. Если имя не найдено — выбрось ошибку.

---starter
; Интерпретатор · Урок 2 — Окружение

; Ячейка окружения: (список пар (имя . значение)).
(define (make-env) (list '()))

; Готово: добавить или обновить имя в окружении.
(define (env-set! env name value)
  (let ((p (assq name (car env))))
    (if p
        (set-cdr! p value)
        (set-car! env (cons (cons name value) (car env))))))

; ЗАДАНИЕ: найди пару с именем name и верни её значение (cdr).
; Несоответствие имени — ошибка.
(define (env-get env name)
  (error 'interp "ЗАДАНИЕ: загляни в ячейку окружения с помощью assq"))

; interp: число, строку, булево и символ (имя).
(define (interp expr env)
  (cond
    ((number? expr) expr)
    ((string? expr) expr)
    ((boolean? expr) expr)
    ((symbol? expr) (env-get env expr))
    (else (error 'interp "непонятный атом" expr))))
---tests
(let ((env (make-env)))
  (env-set! env 'x 42)
  (zchm-check-equal "имя x → 42" (interp 'x env) 42))

(let ((env (make-env)))
  (env-set! env 'speed 100)
  (env-set! env 'speed 60)
  (zchm-check-equal "переопределение имени" (interp 'speed env) 60))

(let ((env (make-env)))
  (env-set! env 'pi 314)
  (zchm-check-equal "другое имя не влияет на числа" (interp 7 env) 7))