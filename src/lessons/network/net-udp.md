---
id: net-udp
title: "Урок 3. UDP-датаграммы"
track: network
order: 3
skills:
  - udp
---

## Датаграммы, а не поток

TCP — это надёжный поток байтов: соединение, порядок, повторная передача. UDP — другой мир: **датаграммы**. Каждая `udp-send-to` посылает цельное сообщение получателю, но без всяких гарантий: не факт, что оно дойдёт, и не факт, что без дублей. Зато это быстро и не требует соединения.

UDP-сокет создаётся так:

```scheme
(define sock (udp-socket))       ; не связан ни с портом, ни с адресом
(udp-bind! sock 8080)            ; слушаем порт (0 — любой свободный)
(udp-send-to sock "127.0.0.1" 9000 (string->utf8 "пинг"))
```

Приём сообщения возвращает и данные, и адрес отправителя:

```scheme
(let ((msg (udp-receive-from sock)))  ; список из трёх элементов
  (car msg)        ; байтвектор с данными
  (cadr msg)       ; адрес отправителя, например "127.0.0.1"
  (caddr msg))     ; его порт
```

## Задание

Реализуй `ping-pong`: принять одну датаграмму, послать отправителю ответную «понг» и вернуть строку с тем, что получили.

---starter
; Сеть · Урок 3 — UDP-датаграммы
;
; ЗАДАНИЕ: ping-pong принимает UDP-сокет, который уже слушает порт.
; Прими одну датаграмму, отправь отправителю (string->utf8 "понг")
; и верни строку полученного сообщения.

(define (ping-pong sock)
  (error 'net "ЗАДАНИЕ: прими датаграмму, ответь «понг» и верни строку сообщения"))
---tests
(define server (let ((s (udp-socket))) (udp-bind! s 0) s))
(define port (local-port server))
(define client (udp-socket))
(define sent (udp-send-to client "127.0.0.1" port (string->utf8 "пинг")))
(define got (ping-pong server))
(define reply (udp-receive-from client))

(socket-close! client)
(socket-close! server)

(zchm-check-equal "ping-pong принял «пинг»" got "пинг")
(zchm-check-equal "клиент получил «понг»" (utf8->string (car reply)) "понг")