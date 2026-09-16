---
id: db-transactions
title: "Урок 7. Транзакции и журнал"
track: database
order: 7
skills:
  - transactions
  - durability
---

## Всё или ничего

Перевод со счёта на счёт — две операции: списать у одного, зачислить другому. Если программа упадёт между ними, деньги исчезнут. **Транзакция** — это пакет операций, который применяется целиком или не применяется вовсе: `commit` фиксирует все изменения, `rollback` отменяет их.

Пока транзакция не зафиксирована, таблицу не трогают — операции копятся в списке «ожидающих».

```scheme
(define tx (tx-begin t))
(tx-insert! tx '(2 "Борис")) ; пока только в ожидающих
(tx-rollback tx)             ; передумали — таблица как была
```

## Устойчивость: не потерять файл

Даже с транзакциями запись на диск опасна: если выключить питание посреди `table-save`, файл останется наполовину записанным. Приём — **писать во временный файл и переименовывать**: переименование заменяет старый файл одним действием.

```scheme
(table-save t "db.sps.tmp")  ; пишем во временный
(rename-file "db.sps.tmp" "db.sps") ; заменяем одним движением
```

Так у базы всегда есть целый файл: либо старый, либо новый. Настоящие СУБД дополняют это **журналом** — списком операций, по которому можно восстановить состояние после сбоя.

## Задание

Реализуй `tx-begin`, `tx-insert!`, `tx-commit`, `tx-rollback` и `table-save-atomic`. Запись `transaction` с полями `table` и `pending` уже объявлена.

---starter
; Базы данных · Урок 7 — Транзакции и журнал
;
; ЗАДАНИЕ: реализуй транзакции и атомарное сохранение.
;   tx-begin   — новая транзакция для таблицы t с пустым списком pending;
;   tx-insert! — добавь строку в pending (не в таблицу!);
;   tx-commit  — примени все строки pending к таблице через table-insert!,
;                затем очисти pending;
;   tx-rollback— очисти pending, таблицу не трогай;
;   table-save-atomic — сохрани в path + ".tmp", затем rename-file поверх path
;                (старый файл удали, если он есть).

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

(define (table-save t path)
  (call-with-output-file path
    (lambda (out)
      (write (table-columns t) out)
      (newline out)
      (for-each (lambda (row)
                  (write row out)
                  (newline out))
                (table-rows t)))))

(define (table-load path)
  (call-with-input-file path
    (lambda (in)
      (let ((columns (read in)))
        (let ((t (make-table columns)))
          (let loop ()
            (let ((row (read in)))
              (unless (eof-object? row)
                (table-insert! t row)
                (loop))))
          t)))))

(define-record-type transaction
  (fields (immutable table) (mutable pending)))

(define (tx-begin t)
  (error 'db "ЗАДАНИЕ: начни транзакцию с пустым списком операций"))

(define (tx-insert! tx row)
  (error 'db "ЗАДАНИЕ: отложи вставку строки до коммита"))

(define (tx-commit tx)
  (error 'db "ЗАДАНИЕ: примени отложенные строки к таблице"))

(define (tx-rollback tx)
  (error 'db "ЗАДАНИЕ: отмени отложенные строки"))

(define (table-save-atomic t path)
  (error 'db "ЗАДАНИЕ: сохрани таблицу атомарно, через временный файл"))
---tests
(let ()
  (define t (make-table '(id name)))
  (define seeded (table-insert! t '(1 "Аня")))

  (define tx (tx-begin t))
  (define queued
    (begin
      (tx-insert! tx '(2 "Борис"))
      (tx-insert! tx '(3 "Вера"))))
  (define count-before-rollback (table-count t))
  (define rolled-back (tx-rollback tx))
  (define count-after-rollback (table-count t))

  (define tx2 (tx-begin t))
  (define queued2
    (begin
      (tx-insert! tx2 '(2 "Борис"))
      (tx-insert! tx2 '(3 "Вера"))))
  (define count-before-commit (table-count t))
  (define committed (tx-commit tx2))
  (define count-after-commit (table-count t))

  (define saved (table-save-atomic t "atomic.sps"))
  (define loaded (table-load "atomic.sps"))

  (define t2 (make-table '(id name)))
  (define t2-seeded (table-insert! t2 '(9 "Игорь")))
  (define saved2 (table-save-atomic t2 "atomic.sps"))
  (define reloaded (table-load "atomic.sps"))

  (zchm-check-equal "до коммита таблица не менялась" count-before-commit 1)
  (zchm-check-equal "откат не добавил строк" count-after-rollback 1)
  (zchm-check-equal "коммит применил все строки" count-after-commit 3)
  (zchm-check-equal "строки в порядке добавления"
                    (table-rows t)
                    '((1 "Аня") (2 "Борис") (3 "Вера")))
  (zchm-check "файл базы записан" (file-exists? "atomic.sps"))
  (zchm-check "временный файл убран" (not (file-exists? "atomic.sps.tmp")))
  (zchm-check-equal "атомарная запись читается"
                    (table-rows loaded)
                    '((1 "Аня") (2 "Борис") (3 "Вера")))
  (zchm-check-equal "перезапись заменила содержимое"
                    (table-rows reloaded)
                    '((9 "Игорь"))))
