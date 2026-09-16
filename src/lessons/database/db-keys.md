---
id: db-keys
title: "Урок 4. Ключи и сортировка"
track: database
order: 4
skills:
  - keys
  - sorting
---

## Первичный ключ

В таблице часто есть столбец, чьи значения не повторяются, — например, `id`. Такой столбец называют **первичным ключом**: по нему одну строку можно отличить от любой другой. База обязана не допускать двух строк с одинаковым ключом, иначе «найти строку с id = 1» перестанет быть однозначным.

`insert-unique!` вставляет строку, только если ключа ещё нет, и сигналит об ошибке при повторе. Ошибку можно перехватить формой `guard`:

```scheme
(guard (e (#t (display "ключ занят")))
  (insert-unique! t 'id '(1 "Дубль")))
```

## Сортировка

Чтобы данные было удобно искать, строки **упорядочивают** по ключу. В Scheme есть готовая `sort`: она принимает предикат «меньше» и список.

```scheme
(sort (lambda (a b) (< (row-ref a cols 'id) (row-ref b cols 'id))) rows)
```

## Бинарный поиск

По отсортированному списку значение ищут **делением пополам**: смотрят на середину и отбрасывают ту половину, где значения заведомо не подходят. Так находят за считанные шаги там, где перебор проверил бы всю таблицу. Список превращают в вектор (`list->vector`), чтобы обращаться к середине по индексу.

## Задание

Реализуй `insert-unique!` (вставка с проверкой ключа), `table-sort` (упорядочить строки по столбцу-ключу) и `table-find` (бинарный поиск строки по значению ключа).

---starter
; Базы данных · Урок 4 — Ключи и сортировка
;
; ЗАДАНИЕ: реализуй insert-unique!, table-sort и table-find.
;   insert-unique! — если строка с таким значением key-name уже есть, вызови
;                    error; иначе добавь через table-insert!;
;   table-sort     — верни новую таблицу: те же строки, отсортированные
;                    процедурой sort по значению столбца key-name;
;   table-find     — в отсортированной таблице найди строку делением пополам
;                    (list->vector + vector-ref), верни строку или #f.

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

(define (insert-unique! t key-name row)
  (error 'db "ЗАДАНИЕ: вставь строку, если ключ ещё свободен"))

(define (table-sort t key-name)
  (error 'db "ЗАДАНИЕ: верни таблицу со строками, отсортированными по ключу"))

(define (table-find t key-name value)
  (error 'db "ЗАДАНИЕ: найди строку в отсортированной таблице делением пополам"))
---tests
(let ()
  (define t (make-table '(id name)))
  (define filled
    (for-each (lambda (row) (insert-unique! t 'id row))
              '((3 "Вера") (1 "Аня") (2 "Борис"))))
  (define sorted (table-sort t 'id))
  (define duplicate-rejected
    (guard (e (#t #t))
      (insert-unique! t 'id '(1 "Дубль"))
      #f))

  (zchm-check-equal "уникальные строки вставлены" (table-count t) 3)
  (zchm-check "повтор ключа отклонён" duplicate-rejected)
  (zchm-check-equal "сортировка по ключу"
                    (table-rows sorted)
                    '((1 "Аня") (2 "Борис") (3 "Вера")))
  (zchm-check-equal "исходная таблица не отсортирована"
                    (table-rows t)
                    '((3 "Вера") (1 "Аня") (2 "Борис")))
  (zchm-check-equal "поиск в середине" (table-find sorted 'id 2) '(2 "Борис"))
  (zchm-check-equal "поиск первого" (table-find sorted 'id 1) '(1 "Аня"))
  (zchm-check-equal "поиск последнего" (table-find sorted 'id 3) '(3 "Вера"))
  (zchm-check-equal "ключ не найден" (table-find sorted 'id 9) #f))
