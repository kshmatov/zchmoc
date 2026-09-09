---
id: net-tcp-client
title: "Урок 2. TCP-клиент"
track: network
order: 2
skills:
  - tcp
  - client
---

## Клиентский сокет

В отличие от сервера, клиент не слушает порт, а **подключается к чужому адресу**. Всё делает `tcp-connect`:

```scheme
(define sock (tcp-connect "127.0.0.1" 8080))
```

Дальше сокет используется так же: `socket-send` отправляет данные, `socket-receive` читает. Соединение — это канал в обе стороны; кто закрыл свой сокет, тем и оборвал связь. Если удалённая сторона закрыла соединение, `socket-receive` вернёт пустой байтвектор `#vu8()`.

Работать по сети можно только с `127.0.0.1`: браузерная песочница физически не имеет сетевого доступа, а в sidecar для обучения разрешён только loopback.

## Отправка строк и байтвекторов

Сеть передаёт байты, поэтому строки превращают в байтвекторы и обратно:

```scheme
(string->utf8 "привет") ; строка → байты
(utf8->string bv)       ; байты → строка
```

## Задание

Реализуй `uppercase-request` — подключиться к серверу, отправить сообщение, дождаться ответа и вернуть его строкой.

---starter
; Сеть · Урок 2 — TCP-клиент
;
; ЗАДАНИЕ: uppercase-request подключается к host:port, отправляет
; строку message как UTF-8, читает ответ (до 1024 байт) и возвращает
; его строкой. Сокет по окончании закрыть.

(define (uppercase-request host port message)
  (error 'net "ЗАДАНИЕ: подключись, отправь сообщение и верни ответ"))
---tests
(define server (tcp-listen 0))
(define port (local-port server))
(define got (box #f))
(define server-thread
  (fork-thread
    (lambda ()
      (let ((conn (tcp-accept server)))
        (set-box! got (utf8->string (socket-receive conn 1024)))
        (socket-send conn (string->utf8 (string-upcase (unbox got))))
        (socket-close! conn)))))
(define reply (uppercase-request "127.0.0.1" port "привет, клиент"))

(thread-join server-thread)
(socket-close! server)

(zchm-check-equal "сервер получил сообщение клиента" (unbox got) "привет, клиент")
(zchm-check-equal "клиент получил ответ сервера" reply "ПРИВЕТ, КЛИЕНТ")