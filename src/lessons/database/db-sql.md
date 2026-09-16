---
id: db-sql
title: "Урок 8. Мини-SQL"
track: database
order: 8
skills:
  - sql
  - parsing
  - interpreter
---

## От функций к тексту

До сих пор запрос был функцией Scheme. Но настоящие СУБД понимают **SQL** — язык запросов в виде текста:

```sql
select id name from users where city = "Москва"
```

Чтобы выполнить такой запрос, его нужно разобрать. Работа знакома по треку «Интерпретатор»: **лексер → парсер → вычисление**. Лексер режет строку на **токены**, парсер собирает из них структуру запроса, а вычисление выполняет её поверх таблиц.

## Токенизация

`s` — список символов строки. Идём по нему и выписываем токены, пропуская пробелы:

```scheme
"select id name from users where city = \"Москва\""
;; → (select id name from users where city = "Москва")
```

Числа становятся числами, слова — символами, запятая — отдельным токеном-символом `,`. Токенизатор `sql-tokenize` уже готов.

## Разбор в запрос

Парсер проверяет форму `select <колонки> from <таблица> [where <колонка> = <значение>]` и группирует колонки в список:

```scheme
(sql-parse '(select id name from users where city = "Москва"))
;; → (select (id name) from users where city "Москва")
```

`where` необязателен: без него запрос выглядит как `(select (id name) from users)`.

## Выполнение

Разобранный запрос выполняется **поверх уже построенной мини-СУБД**: `where` отбирает строки — это `db-select`, а список колонок — это `db-project`. Значение `*` в колонках означает «все столбцы», и проекцию тогда не делаем.

## Задание

Реализуй `sql-parse` (токены → запрос) и `sql-run` (реестр таблиц + запрос → таблица). Реестр — это список пар `(имя . таблица)`; `registry-ref` уже готов. `sql-tokenize` тоже готов.

---starter
; Базы данных · Урок 8 — Мини-SQL
;
; ЗАДАНИЕ: реализуй разбор и выполнение SQL-запроса.
;   sql-parse — собери токены в (select (колонки...) from таблица
;               where колонка значение); где-блока может не быть, тогда
;               результат — (select (колонки...) from таблица); токены-
;               запятые между колонками пропускай;
;   sql-run   — найди таблицу в реестре, при наличии where отбери строки
;               через db-select (сравнение через equal?), затем, если
;               колонки не (*), спроецируй через db-project.

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
  (let ((result (make-table (table-columns t))))
    (for-each (lambda (row)
                (when (pred row) (table-insert! result row)))
              (table-rows t))
    result))

(define (db-project t names)
  (let ((cols (table-columns t))
        (result (make-table names)))
    (for-each (lambda (row)
                (table-insert! result
                               (map (lambda (name) (row-ref row cols name))
                                    names)))
              (table-rows t))
    result))

(define (word-char? c)
  (or (char-alphabetic? c)
      (char-numeric? c)
      (char=? c #\-)
      (char=? c #\_)))

(define (sql-tokenize str)
  (let loop ((chars (string->list str)) (tokens '()))
    (cond
      ((null? chars) (reverse tokens))
      ((char-whitespace? (car chars)) (loop (cdr chars) tokens))
      ((char=? (car chars) #\,) (loop (cdr chars) (cons '|,| tokens)))
      ((char=? (car chars) #\*) (loop (cdr chars) (cons '* tokens)))
      ((char=? (car chars) #\=) (loop (cdr chars) (cons '= tokens)))
      ((char=? (car chars) #\")
       (let scan ((rest (cdr chars)) (acc '()))
         (cond ((null? rest) (error 'sql "незакрытая кавычка" str))
               ((char=? (car rest) #\")
                (loop (cdr rest)
                      (cons (list->string (reverse acc)) tokens)))
               (else (scan (cdr rest) (cons (car rest) acc))))))
      ((char-numeric? (car chars))
       (let scan ((rest chars) (acc '()))
         (if (and (pair? rest) (char-numeric? (car rest)))
             (scan (cdr rest) (cons (car rest) acc))
             (loop rest
                   (cons (string->number (list->string (reverse acc)))
                         tokens)))))
      (else
       (let scan ((rest chars) (acc '()))
         (if (and (pair? rest) (word-char? (car rest)))
             (scan (cdr rest) (cons (car rest) acc))
             (loop rest
                   (cons (string->symbol (list->string (reverse acc)))
                         tokens))))))))

(define (registry-ref registry name)
  (let ((entry (assq name registry)))
    (if entry
        (cdr entry)
        (error 'sql "нет такой таблицы" name))))

(define (sql-parse tokens)
  (error 'sql "ЗАДАНИЕ: собери токены в структуру запроса"))

(define (sql-run registry query)
  (error 'sql "ЗАДАНИЕ: выполни запрос поверх таблиц"))
---tests
(let ()
  (define users (make-table '(id name city)))
  (define filled
    (for-each (lambda (row) (table-insert! users row))
              '((1 "Аня" "Москва")
                (2 "Борис" "Казань")
                (3 "Вера" "Москва"))))
  (define registry (list (cons 'users users)))

  (define tokens
    (sql-tokenize "select id name from users where city = \"Москва\""))
  (define query (sql-parse tokens))
  (define moscow (sql-run registry query))

  (define all
    (sql-run registry (sql-parse (sql-tokenize "select * from users"))))
  (define everyone
    (sql-run registry (sql-parse (sql-tokenize "select name from users"))))
  (define id-two
    (sql-run registry
             (sql-parse (sql-tokenize "select name from users where id = 2"))))
  (define comma-result
    (sql-run registry
             (sql-parse
              (sql-tokenize "select id, name from users where city = \"Москва\""))))

  (zchm-check-equal "лексер разбил запрос на токены"
                    tokens
                    '(select id name from users where city = "Москва"))
  (zchm-check-equal "парсер собрал запрос"
                    query
                    '(select (id name) from users where city "Москва"))
  (zchm-check-equal "where отобрал строки"
                    (table-rows moscow)
                    '((1 "Аня") (3 "Вера")))
  (zchm-check-equal "проекция оставила колонки"
                    (table-columns moscow)
                    '(id name))
  (zchm-check-equal "звёздочка сохраняет схему"
                    (table-columns all)
                    '(id name city))
  (zchm-check-equal "звёздочка возвращает все строки"
                    (table-count all)
                    3)
  (zchm-check-equal "запрос без where"
                    (table-rows everyone)
                    '(("Аня") ("Борис") ("Вера")))
  (zchm-check-equal "число в where"
                    (table-rows id-two)
                    '(("Борис")))
  (zchm-check-equal "запятые между колонками пропущены"
                    (table-columns comma-result)
                    '(id name))
  (zchm-check-equal "запрос с запятыми вернул строки"
                    (table-rows comma-result)
                    '((1 "Аня") (3 "Вера")))
  (zchm-check-equal "исходная таблица не изменилась"
                    (table-rows users)
                    '((1 "Аня" "Москва")
                      (2 "Борис" "Казань")
                      (3 "Вера" "Москва"))))
