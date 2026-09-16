---
id: db-index
title: "Урок 5. Индексы"
track: database
order: 5
skills:
  - indexes
  - hashtables
---

## Поиск перебором — это медленно

`db-select` просматривает таблицу строка за строкой. Если строк миллион, а нужна одна, придётся проверить весь миллион. **Индекс** — отдельная структура, которая заранее раскладывает строки по значениям столбца, чтобы поиск занимал считанные шаги.

## Хэш-таблица

Индекс удобно хранить в **хэш-таблице** — структуре «ключ → значение» с мгновенным доступом по ключу. В Scheme её создаёт `make-hashtable`:

```scheme
(define index (make-hashtable equal-hash equal?))
(hashtable-set! index "Москва" (list row))   ; положить
(hashtable-ref index "Москва" '())           ; взять, '() — если ключа нет
```

Столбец-индекс не обязан быть уникальным: в городе живёт много людей, поэтому по одному значению храним **список** строк. Строим индекс один раз, пробежав таблицу, а затем ищем по нему.

## Задание

Реализуй `db-build-index` — построить индекс по столбцу, и `db-index-lookup` — достать из индекса строки с заданным значением (`'()`, если таких нет).

---starter
; Базы данных · Урок 5 — Индексы
;
; ЗАДАНИЕ: реализуй db-build-index и db-index-lookup.
;   db-build-index  — создай make-hashtable equal-hash equal? и для каждой
;                     строки добавь её в список по значению столбца column
;                     (hashtable-ref со значением по умолчанию, затем
;                     hashtable-set! с новой строкой в начале списка);
;   db-index-lookup — верни список строк по значению (по умолчанию пустой).

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

(define (db-build-index t column)
  (error 'db "ЗАДАНИЕ: собери индекс по столбцу"))

(define (db-index-lookup index value)
  (error 'db "ЗАДАНИЕ: достань строки по значению из индекса"))
---tests
(let ()
  (define people (make-table '(id city)))
  (define filled
    (for-each (lambda (row) (table-insert! people row))
              '((1 "Москва") (2 "Казань") (3 "Москва"))))
  (define index (db-build-index people 'city))
  (define moscow (db-index-lookup index "Москва"))
  (define kazan (db-index-lookup index "Казань"))
  (define missing (db-index-lookup index "Сочи"))

  (zchm-check-equal "в Москве две строки" (length moscow) 2)
  (zchm-check "строка с id 1 в Москве"
              (if (member '(1 "Москва") moscow) #t #f))
  (zchm-check "строка с id 3 в Москве"
              (if (member '(3 "Москва") moscow) #t #f))
  (zchm-check-equal "в Казани одна строка"
                    (length kazan)
                    1)
  (zchm-check-equal "казанская строка" (car kazan) '(2 "Казань"))
  (zchm-check "неизвестное значение даёт пусто" (null? missing))
  (zchm-check-equal "индекс не тронул таблицу"
                    (table-rows people)
                    '((1 "Москва") (2 "Казань") (3 "Москва"))))
