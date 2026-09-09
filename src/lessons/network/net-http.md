---
id: net-http
title: "Урок 5. Мини-HTTP-сервер"
track: network
order: 5
skills:
  - http
  - server
  - tcp
---

## Протокол поверх TCP

HTTP — это просто набор правил поверх TCP: клиент отправляет **запрос**, сервер — **ответ**. Запрос выглядит так:

```
GET /hello HTTP/1.1
Host: localhost

```

Первая строка — request line: метод, путь, версия. Дальше заголовки, пустая строка и тело (если есть). Ответ сервера похож:

```
HTTP/1.1 200 OK
Content-Length: 13
Connection: close

Привет, мир!
```

`Content-Length` — количество байт тела ответа. Закрытие соединения (`Connection: close`) говорит клиенту «всё получено, можно не ждать дальше». Чтобы собрать такой ответ в Scheme, понадобится длина тела в байтах:

```scheme
(string-append
  "HTTP/1.1 200 OK\r\n"
  "Content-Length: ")
```

## Задание

Реализуй `http-reply` (вернуть строку ответа 200 OK с телом) и `serve-http` — принять одно соединение, прочитать запрос и ответить через `http-reply`.

---starter
; Сеть · Урок 5 — Мини-HTTP-сервер
;
; ЗАДАНИЕ 1: http-reply принимает строку body и возвращает полный
; HTTP-ответ: "HTTP/1.1 200 OK", заголовки Content-Length (в байтах),
; Connection: close и пустую строку перед телом.
;
; ЗАДАНИЕ 2: serve-http принимает listener, принимает одно соединение
; через tcp-accept, читает запрос (до 1024 байт), отвечает через
; http-reply "Привет, мир!" и возвращает прочитанный запрос строкой.

(define (http-reply body)
  (error 'net "ЗАДАНИЕ: собери HTTP-ответ с телом body"))

(define (serve-http listener)
  (error 'net "ЗАДАНИЕ: прими соединение, ответь http-reply и верни запрос"))
---tests
(define server (tcp-listen 0))
(define port (local-port server))
(define got (box #f))
(define server-thread
  (fork-thread
    (lambda ()
      (set-box! got (serve-http server)))))
(define client (tcp-connect "127.0.0.1" port))
(define sent (socket-send client (string->utf8
  (string-append "GET /hello HTTP/1.1\r\nHost: localhost\r\n\r\n"))))
(define response (utf8->string (socket-receive client 1024)))

(socket-close! client)
(thread-join server-thread)
(socket-close! server)

(zchm-check-equal "сервер прочитал запрос целиком"
  (unbox got) "GET /hello HTTP/1.1\r\nHost: localhost\r\n\r\n")
(zchm-check "ответ начинается с HTTP/1.1 200 OK"
  (and (>= (string-length response) 15)
       (equal? (substring response 0 15) "HTTP/1.1 200 OK")))
(zchm-check "в ответе есть приветствие"
  (zchm-contains? response "Привет, мир!"))
(zchm-check "в ответе указан Content-Length"
  (zchm-contains? response "Content-Length: 21"))