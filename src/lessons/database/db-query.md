---
id: db-query
title: "Урок 3. Запросы-выборки"
track: database
order: 3
skills:
  - queries
---

## Запрос — это функция над таблицей

Данные лежат в таблице, а нужна обычно лишь их часть. **Запрос** выбирает строки и столбцы. В нашей мини-СУБД запрос — не строка с текстом команды, а обычная функция Scheme: она берёт таблицу и возвращает **новую** таблицу, не меняя исходную.

Два базовых шага:

- **выборка** `db-select` оставляет строки, для которых предикат истинен;
- **проекция** `db-project` оставляет только названные столбцы.

```scheme
(db-select people (lambda (row) (>= (row-ref row (table-columns people) 'age) 18)))
(db-project people '(name))
```

Так как обе процедуры возвращают таблицу, их можно **соединять** в цепочки — результат одного шага становится входом следующего:

```scheme
(db-project (db-select people older-than-18?) '(name))
```

## Задание

Реализуй `db-select` и `db-project`. Пробеги по строкам через `for-each`, отбирай подходящие и добавляй в новую таблицу.

---starter
; Базы данных · Урок 3 — Запросы-выборки
;
; ЗАДАНИЕ: реализуй db-select и db-project.
;   db-select  — создай таблицу с той же схемой и добавь строки, для которых
;                (pred row) истинно;
;   db-project — создай таблицу со схемой names и для каждой строки возьми
;                значения столбцов из names (через row-ref).

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

(define (db-select t pred)
  (error 'db "ЗАДАНИЕ: верни новую таблицу с отобранными строками"))

(define (db-project t names)
  (error 'db "ЗАДАНИЕ: верни новую таблицу только с указанными столбцами"))
---tests
(let ()
  (define people (make-table '(id name age)))
  (define cols (table-columns people))
  (define filled
    (for-each (lambda (row) (table-insert! people row))
              '((1 "Аня" 30) (2 "Борис" 17) (3 "Вера" 25))))
  (define adults
    (db-select people (lambda (row) (>= (row-ref row cols 'age) 18))))
  (define names (db-project people '(name)))
  (define adult-names (db-project adults '(name)))
  (define original '((1 "Аня" 30) (2 "Борис" 17) (3 "Вера" 25)))

  (zchm-check-equal "выборка отфильтровала по предикату"
                    (table-count adults)
                    2)
  (zchm-check-equal "выборка сохранила схему"
                    (table-columns adults)
                    '(id name age))
  (zchm-check-equal "выборка сохранила порядок"
                    (table-rows adults)
                    '((1 "Аня" 30) (3 "Вера" 25)))
  (zchm-check-equal "проекция оставила один столбец"
                    (table-columns names)
                    '(name))
  (zchm-check-equal "проекция взяла значения"
                    (table-rows names)
                    '(("Аня") ("Борис") ("Вера")))
  (zchm-check-equal "шаги соединяются в цепочку"
                    (table-rows adult-names)
                    '(("Аня") ("Вера")))
  (zchm-check-equal "исходная таблица не изменилась"
                    (table-rows people)
                    original))
