---
id: net-http-client
title: "Урок 6. Сетевой HTTP-клиент"
track: network
order: 6
skills:
  - http
  - client
  - tcp
---

## Клиентская сторона HTTP

В уроке 5 ты писал сервер, который отвечает на запрос. Теперь наоборот: клиент сам составляет HTTP-запрос, отправляет его по TCP и разбирает ответ. Запрос выглядит так:

```
GET /data HTTP/1.1
Host: 127.0.0.1
Connection: close

```

Заголовок `Connection: close` — обещание сервера закрыть соединение, когда ответ передан. Поэтому простое правило чтения: **читать, пока сервер не закроет соединение**. Наш `socket-receive` возвращает пустой байтвектор `#vu8()` как раз в тот момент, когда другая сторона закрыла соединение:

```scheme
(let loop ((acc '()))
  (let ((chunk (socket-receive sock 1024)))
    (if (= (bytevector-length chunk) 0)
        (reverse acc)
        (loop (cons chunk acc)))))
```

Внимание: одна длинная строка может прийти несколькими кусками, а два коротких ответа — слиться в один. Поэтому читать надо именно в цикле, накапливая куски. Склеивать куски в строку можно так:

```scheme
(utf8->string (zchm-concat-bytes (reverse acc)))
```

`zchm-concat-bytes` — предоставленный helper: склеивает список байтвекторов в один. Превращать в строку отдельные куски по одному нельзя: кусок может разорвать многобайтовый символ UTF-8. Сначала склей куски в один байтвектор, потом конвертируй.

## Тело ответа

Ответ сервера состоит из заголовков и тела, разделённых пустой строкой:

```
HTTP/1.1 200 OK
Content-Length: 5

hello
```

Разбор ответа сделан за тебя — helper `zchm-http-body` возвращает строку с телом (всё после первого `\r\n\r\n`).

## Задание

Реализуй `http-get` — подключиться, отправить GET-запрос на путь `path`, прочитать ответ до закрытия соединения и вернуть **тело ответа строкой** через `zchm-http-body`.

---starter
; Сеть · Урок 6 — Сетевой HTTP-клиент
;
; ЗАДАНИЕ: http-get подключается к host:port, отправляет запрос
;   "GET path HTTP/1.1\r\nHost: host\r\nConnection: close\r\n\r\n",
; читает ответ, пока сервер не закроет соединение, склеивает куски
; в строку и возвращает (zchm-http-body <эта строка>).

(define (http-get host port path)
  (error 'net "ЗАДАНИЕ: отправь GET и верни тело ответа"))
---tests
(define server (tcp-listen 0))
(define port (local-port server))
(define request (box #f))
(define server-thread
  (fork-thread
    (lambda ()
      (let ((conn (tcp-accept server)))
        (set-box! request (utf8->string (socket-receive conn 1024)))
        (socket-send conn (string->utf8
          (string-append "HTTP/1.1 200 OK\r\nContent-Length: 5\r\n\r\n"
                         "hello")))
        (socket-close! conn)))))
(define body (http-get "127.0.0.1" port "/data"))

(thread-join server-thread)
(socket-close! server)

(zchm-check-equal "клиент вернул тело ответа" body "hello")
(zchm-check-equal "сервер увидел GET на /data"
  (unbox request) "GET /data HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")