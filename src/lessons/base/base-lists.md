---
id: base-lists
title: "Урок 4. Списки из пар"
track: base
order: 4
skills:
  - lists
  - pairs
  - null
---

Списки — главная структура данных Scheme. `(1 2 3)` — это **список**. Разберёмся, из чего он состоит.

## Пара

Минимальный кирпичик — **пара** (`pair`). Пара соединяет два значения:

```scheme
(cons 1 2)   ; (1 . 2)
```

`cons` строит пару, `car` берёт первый элемент, `cdr` — второй:

```scheme
(car (cons 'a 'b))  ; a
(cdr (cons 'a 'b))  ; b
```

## Список — цепочка пар

Список — это пары, вложенные друг в друга по второму элементу; последний элемент — специальное значение `'()` (пустой список):

```scheme
(cons 1 (cons 2 '()))   ; (1 2)
```

Живой пример:

```scheme
(define xs '(яблоко груша слива))
(car xs)            ; яблоко
(cdr xs)            ; (груша слива)
(car (cdr xs))      ; груша
(cadddr xs)         ; слива — car цепочки из трёх cdr
```

Сокращённые формы: `(cadr xs)` = `(car (cdr xs))`, `(caddr xs)` = `(car (cdr (cdr xs)))`.

## Предикаты списков

```scheme
(pair? '(1 2))   ; #t — список — это цепочка пар
(null? '())      ; #t — пустой список
(null? '(1))     ; #f
```

## Задание

Напиши две процедуры: достать второй элемент и собрать список из трёх значений.

---starter
; Урок 4 · Списки из пар
;
; ЗАДАНИЕ 1: (second lst) — возвращает второй элемент списка
; выражением через car и cdr.
;
; ЗАДАНИЕ 2: (make-triple a b c) — собирает список (a b c) через cons.

(define (second lst)
  (error 'base "ЗАДАНИЕ: верни второй элемент списка"))

(define (make-triple a b c)
  (error 'base "ЗАДАНИЕ: собери список из трёх элементов"))
---tests
(define t1 (second '(1 2 3)))
(define t2 (second '(a b)))
(define trip (make-triple 10 20 30))

(zchm-check-equal "второй элемент (1 2 3)" t1 2)
(zchm-check-equal "второй элемент (a b)" t2 'b)
(zchm-check-equal "make-triple 10 20 30" trip '(10 20 30))
(zchm-check "результат — список (пара)" (pair? trip))
(zchm-check-equal "первый элемент тройки" (car trip) 10)
(zchm-check-equal "последний элемент тройки" (car (cdr (cdr trip))) 30)