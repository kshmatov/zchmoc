---
id: db-persistence
title: "Урок 2. Хранение на диске"
track: database
order: 2
skills:
  - persistence
  - files
---

## Данные переживают перезапуск

Пока таблица живёт только в памяти: закрыл программу — данные пропали. Настоящая база данных **хранит** их на диске. Трек выполняется системным Scheme (sidecar), поэтому у программы есть доступ к файлам.

## Формат файла

Строка — это обычный список Scheme, поэтому её легко записать и прочитать обратно процедурами `write` и `read`. Заведём простой формат: первая строка файла — схема, дальше по строке на каждую запись.

```scheme
(write '(id name) out)  ; схема
(write '(1 "Аня") out)  ; строка
```

`call-with-output-file` открывает файл на запись и сам закрывает его после процедуры; `call-with-input-file` — на чтение. Чтение идёт до конца файла, который отмечает `eof-object?`:

```scheme
(call-with-input-file path
  (lambda (in)
    (let loop ()
      (let ((datum (read in)))
        (unless (eof-object? datum)
          ;; ... обработать datum ...
          (loop))))))
```

## Задание

Реализуй `table-save` — записать схему и все строки таблицы в файл, и `table-load` — прочитать файл и собрать таблицу заново. `table-insert!` и остальные процедуры уже готовы.

---starter
; Базы данных · Урок 2 — Хранение на диске
;
; ЗАДАНИЕ: реализуй table-save и table-load.
;   table-save — через call-with-output-file запиши (table-columns t),
;                затем каждую строку из (table-rows t) процедурой write;
;   table-load — через call-with-input-file прочитай схему (первый datum),
;                создай make-table и добавляй строки, пока не eof-object?.

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
  (error 'db "ЗАДАНИЕ: сохрани таблицу в файл"))

(define (table-load path)
  (error 'db "ЗАДАНИЕ: загрузи таблицу из файла"))
---tests
(let ()
  (define t (make-table '(id name)))
  (define empty-db (make-table '(a b)))
  (define saved
    (begin
      (table-insert! t '(1 "Аня"))
      (table-insert! t '(2 "Борис"))
      (table-save t "db.sps")))
  (define loaded (table-load "db.sps"))
  (define empty-saved (table-save empty-db "empty.sps"))
  (define empty-loaded (table-load "empty.sps"))

  (zchm-check "файл базы создан" (file-exists? "db.sps"))
  (zchm-check-equal "схема восстановлена" (table-columns loaded) '(id name))
  (zchm-check-equal "строки восстановлены"
                    (table-rows loaded)
                    '((1 "Аня") (2 "Борис")))
  (zchm-check-equal "поле доступно по имени"
                    (row-ref (car (table-rows loaded)) (table-columns loaded) 'name)
                    "Аня")
  (zchm-check-equal "пустая схема пережила запись"
                    (table-columns empty-loaded)
                    '(a b))
  (zchm-check-equal "пустая таблица осталась пустой"
                    (table-rows empty-loaded)
                    '()))
