---
id: net-udp-chat
title: "Урок 7. UDP-эхо-сервер"
track: network
order: 7
skills:
  - udp
  - server
---

## Несколько датаграмм подряд

В UDP нет соединений: каждая датаграмма приходит отдельной «буквой», а сервер живёт в цикле — принял, ответил, снова принял. Отправитель каждой датаграммы разный, поэтому отвечать надо **по адресу, который вернул приём**:

```scheme
(let ((msg (udp-receive-from sock)))
  (udp-send-to sock (cadr msg) (caddr msg) payload))
```

`cadr` — это адрес отправителя, `caddr` — его порт. Именно по ним клиент ниже в тесте и получит ответ, даже если два клиента шлют на один сервер одновременно.

Количество принятых датаграмм удобно считать рекурсией:

```scheme
(let loop ((n 0))
  (when (< n limit)
    ... 
    (loop (+ n 1))))
```

## Задание

Реализуй `udp-echo-loop`: принять ровно `limit` датаграмм, каждую отправить отправителю обратно с префиксом `эхо: ` и вернуть список принятых сообщений (строками, в порядке приёма).

---starter
; Сеть · Урок 7 — UDP-эхо-сервер
;
; ЗАДАНИЕ: udp-echo-loop принимает UDP-сокет и число limit.
; Прими limit датаграмм, каждую отправь отправителю обратно как
; "эхо: " + текст, верни список строк полученных сообщений.

(define (udp-echo-loop sock limit)
  (error 'net "ЗАДАНИЕ: прими limit датаграмм и ответь каждому отправителю"))
---tests
(define server (let ((s (udp-socket))) (udp-bind! s 0) s))
(define port (local-port server))
(define got (box '()))
(define server-thread
  (fork-thread
    (lambda ()
      (set-box! got (udp-echo-loop server 2)))))
(define client (udp-socket))
(define (ask text)
  (let ((sent (udp-send-to client "127.0.0.1" port (string->utf8 text))))
    (utf8->string (car (udp-receive-from client)))))
(define r1 (ask "привет"))
(define r2 (ask "как дела"))

(thread-join server-thread)
(socket-close! client)
(socket-close! server)

(zchm-check-equal "сервер получил оба сообщения"
  (unbox got) '("привет" "как дела"))
(zchm-check-equal "первое эхо" r1 "эхо: привет")
(zchm-check-equal "второе эхо" r2 "эхо: как дела")