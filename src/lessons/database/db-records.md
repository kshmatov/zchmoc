---
id: db-records
title: "Урок 1. Схема и строки"
track: database
order: 1
skills:
  - records
  - schema
---

## Цель трека

В этом треке ты построишь собственную мини-базу данных на Scheme: таблицы, запросы, ключи, индексы, соединения и транзакции. База будет хранить данные в файлах, поэтому трек выполняется настоящим Scheme (sidecar), а не браузерной песочницей. К концу трека у тебя будет работающая мини-СУБД.

## Таблица и строка

База данных хранит **таблицы**. У таблицы есть **схема** — список имён столбцов — и **строки**. Строка — это список значений в том же порядке, что и столбцы:

```scheme
(make-table '(id name)) ; таблица со столбцами id и name
'(1 "Аня")              ; строка: id = 1, name = "Аня"
```

Таблицу удобно описать записью. `define-record-type` создаёт новый тип с полями; схема столбцов у таблицы не меняется, а строки добавляются и меняются, поэтому одно поле `immutable`, а другое `mutable`:

```scheme
(define-record-type db-table
  (fields (immutable columns) (mutable rows)))
```

`define-record-type` сам создаёт конструктор `make-db-table`, читателей `db-table-columns`/`db-table-rows` и писателя `db-table-rows-set!`. Мы оборачиваем конструктор в `make-table`, чтобы новая таблица сразу была пустой.

## Задание

`column-index` уже готов — он находит номер столбца по имени. Реализуй:

- `table-insert!` — добавить строку в конец таблицы;
- `table-count` — сколько строк в таблице;
- `row-ref` — значение поля строки по имени столбца.

---starter
; Базы данных · Урок 1 — Схема и строки
;
; ЗАДАНИЕ: реализуй table-insert!, table-count и row-ref.
;   table-insert! — добавь row в конец (db-table-rows t) и запиши обратно
;                   через db-table-rows-set!;
;   table-count   — верни длину списка строк;
;   row-ref       — найди номер столбца через column-index и возьми
;                   значение из строки (list-ref).

(define-record-type db-table
  (fields (immutable columns) (mutable rows)))

(define (make-table columns)
  (make-db-table columns '()))

(define (table-columns t) (db-table-columns t))
(define (table-rows t) (db-table-rows t))

(define (column-index columns name)
  (let loop ((i 0) (rest columns))
    (cond ((null? rest) (error 'db "нет такого столбца" name))
          ((eq? (car rest) name) i)
          (else (loop (+ i 1) (cdr rest))))))

(define (table-insert! t row)
  (error 'db "ЗАДАНИЕ: добавь строку в конец таблицы"))

(define (table-count t)
  (error 'db "ЗАДАНИЕ: посчитай строки"))

(define (row-ref row columns name)
  (error 'db "ЗАДАНИЕ: достань значение поля по имени столбца"))
---tests
(define t (make-table '(id name)))
(define a (make-table '(x y z)))
(zchm-check-equal "новая таблица пуста" (table-count t) 0)
(zchm-check-equal "схема на месте" (table-columns t) '(id name))

(table-insert! t '(1 "Аня"))
(table-insert! t '(2 "Борис"))
(zchm-check-equal "две строки" (table-count t) 2)
(zchm-check-equal "строки в порядке добавления"
                  (table-rows t)
                  '((1 "Аня") (2 "Борис")))

(zchm-check-equal "поле id" (row-ref '(1 "Аня") '(id name) 'id) 1)
(zchm-check-equal "поле name" (row-ref '(1 "Аня") '(id name) 'name) "Аня")

(table-insert! a '(10 20 30))
(zchm-check-equal "третий столбец"
                  (row-ref (car (table-rows a)) (table-columns a) 'z)
                  30)
