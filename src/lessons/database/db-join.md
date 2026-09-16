---
id: db-join
title: "Урок 6. Соединения таблиц"
track: database
order: 6
skills:
  - joins
---

## Данные в разных таблицах

Заказ ссылается на пользователя, но хранить имя пользователя в каждой строке заказов расточительно и опасно: поменяется имя — придётся править все заказы. Вместо этого в заказах держат **внешний ключ** — столбец `user-id`, значение которого указывает на `id` в таблице пользователей.

```scheme
(make-table '(id name))          ; пользователи
(make-table '(order-id user-id item)) ; заказы
```

## Соединение

**Соединение** склеивает строки двух таблиц в те, где внешний ключ совпадает с ключом другой таблицы. Проще всего сделать это двумя вложенными циклами: для каждой строки первой таблицы перебрать все строки второй и оставить совпадения.

```scheme
(for-each
 (lambda (user)
   (for-each
    (lambda (order)
      (when (equal? (row-ref user users-cols 'id)
                    (row-ref order orders-cols 'user-id))
        ;; ... добавить (append user order) в результат ...
        ))
    (table-rows orders)))
 (table-rows users))
```

Схема результата — столбцы первой таблицы, за которыми идут столбцы второй.

## Задание

Реализуй `db-join`: соедини таблицы `t1` и `t2` по столбцам `field1` и `field2`. Верни новую таблицу со схемой `(append (table-columns t1) (table-columns t2))`.

---starter
; Базы данных · Урок 6 — Соединения таблиц
;
; ЗАДАНИЕ: реализуй db-join — соединение двух таблиц.
;   Схема результата: (append (table-columns t1) (table-columns t2)).
;   Для каждой строки r1 из t1 и каждой строки r2 из t2, если значения
;   столбцов field1 и field2 равны (equal?), добавь (append r1 r2).

(define-record-type db-table
  (fields (immutable columns) (mutable rows)))

(define (make-table columns) (make-db-table columns '()))
(define (table-columns t) (db-table-columns t))
(define (table-rows t) (db-table-rows t))

(define (column-index columns name)
  (let loop ((i 0) (rest columns))
    (cond ((null? rest) (error 'db "нет такого столбца" name))
          ((eq? (car rest) name) i)
          (else (loop (+ i 1) (cdr rest))))))

(define (table-insert! t row)
  (db-table-rows-set! t (append (db-table-rows t) (list row))))
(define (table-count t) (length (db-table-rows t)))
(define (row-ref row columns name)
  (list-ref row (column-index columns name)))

(define (db-join t1 field1 t2 field2)
  (error 'db "ЗАДАНИЕ: соедини две таблицы по общему полю"))
---tests
(let ()
  (define users (make-table '(id name)))
  (define orders (make-table '(order-id user-id item)))
  (define user-cols (table-columns users))
  (define order-cols (table-columns orders))
  (define users-filled
    (for-each (lambda (row) (table-insert! users row))
              '((1 "Аня") (2 "Борис"))))
  (define orders-filled
    (for-each (lambda (row) (table-insert! orders row))
              '((10 1 "книга") (11 1 "ручка") (12 2 "тетрадь"))))
  (define joined (db-join users 'id orders 'user-id))

  (zchm-check-equal "схема склеена"
                    (table-columns joined)
                    '(id name order-id user-id item))
  (zchm-check-equal "три пары совпали" (table-count joined) 3)
  (zchm-check "заказ Ани на книгу"
              (if (member '(1 "Аня" 10 1 "книга") (table-rows joined)) #t #f))
  (zchm-check "второй заказ Ани"
              (if (member '(1 "Аня" 11 1 "ручка") (table-rows joined)) #t #f))
  (zchm-check "заказ Бориса"
              (if (member '(2 "Борис" 12 2 "тетрадь") (table-rows joined)) #t #f))
  (zchm-check-equal "исходные таблицы не изменились"
                    (table-rows users)
                    '((1 "Аня") (2 "Борис"))))
