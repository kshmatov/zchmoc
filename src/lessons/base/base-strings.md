---
id: base-strings
title: "Урок 11. Строки и символы"
track: base
order: 11
skills:
  - strings
  - characters
---

Строки мы встречали с первого урока. Теперь разберёмся, как их резать и складывать.

## Основные операции

```scheme
(string-length "привет")      ; 6 — число символов
(string-append "ко" "т")      ; "кот"

(substring "abcdef" 2 4)      ; "cd" — с позиции 2 до 4 (не включая)

(string-upcase "привет")      ; "ПРИВЕТ" — регистр букв

(string->number "42")         ; 42 — строка в число (или #f, если не число)
(number->string 42)           ; "42" — число в строку
```

## Строка и список символов

Строка — это последовательность **символов** (`char`). Переходы туда и обратно:

```scheme
(string->list "кот")     ; (#\к #\о #\т)
(list->string '(#\к #\о #\т))   ; "кот"
```

Символ записывается как `#\к`. Отдельный символ строки:

```scheme
(string-ref "кот" 0)     ; #\к

(char=? #\к #\к)         ; #t — сравнение символов
(char->integer #\А)      ; 1040 — код символа
(integer->char 1040)     ; #\А
```

## Задание

Напиши процедуру для инициалов и счётчик букв.

---starter
; Урок 11 · Строки и символы
;
; ЗАДАНИЕ 1: (initials first last) — инициалы в формате "Ф. Ф.":
; первая буква каждой строки, точка, пробел, первая буква, точка.
; Подсказка: (substring s 0 1) и string-append.
;
; ЗАДАНИЕ 2: (letter-count s ch) — сколько раз символ ch встречается
; в строке s. Разбери строку в список символов и пройдись рекурсией.

(define (initials first last)
  (error 'base "ЗАДАНИЕ: верни инициалы строкой"))

(define (letter-count s ch)
  (error 'base "ЗАДАНИЕ: посчитай вхождения символа"))
---tests
(define i1 (initials "Анна" "Вернадская"))
(define i2 (initials "Пётр" "Иванов"))
(define l1 (letter-count "пингвин" #\и))
(define l2 (letter-count "пингвин" #\п))
(define l3 (letter-count "кот" #\з))

(zchm-check-equal "инициалы Анны" i1 "А. В.")
(zchm-check-equal "инициалы Петра" i2 "П. И.")
(zchm-check-equal "букв 'и' в пингвине" l1 2)
(zchm-check-equal "букв 'п' в пингвине" l2 1)
(zchm-check-equal "нет такой буквы → 0" l3 0)