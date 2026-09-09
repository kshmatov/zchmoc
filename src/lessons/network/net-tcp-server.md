---
id: net-tcp-server
title: "Урок 1. TCP-сервер"
track: network
order: 1
skills:
  - tcp
  - server
---

## Цель трека

В этом треке ты научишься общаться по сети: принимать и устанавливать соединения TCP, посылать датаграммы UDP, а в конце напишешь маленький HTTP-сервер. Программы сетевого трека запускаются настоящим Scheme (sidecar), а не браузером — работать можно только с loopback-адресом `127.0.0.1`.

## Серверный сокет

Серверу нужен **слушающий сокет** — его создаёт `tcp-listen`, привязывающийся к порту:

```scheme
(define server (tcp-listen 0)) ; порт 0 — взять любой свободный
(local-port server)            ; на каком порту реально слушаем
```

Каждое входящее соединение принимается процедурой `tcp-accept` — она блокируется, пока кто-то не подключится, и возвращает сокет соединения:

```scheme
(define conn (tcp-accept server))
```

Принятый сокет умеет читать и писать:

```scheme
(socket-receive conn 1024) ; блокирующее чтение: байтвектор
(socket-send conn bv)      ; отправка байтвектора
(socket-close! conn)       ; закрыть соединение
```

`tcp-accept` в тестах работает в отдельном потоке (приём не останавливает всю программу), а клиент подключается из главного потока.

## Задание

Реализуй `echo-once` — принять одно соединение, прочитать сообщение и отправить его обратно.

---starter
; Сеть · Урок 1 — TCP-сервер
;
; ЗАДАНИЕ: echo-once принимает одно соединение через tcp-accept,
; читает сообщение (не больше 1024 байт), отправляет его же обратно
; и закрывает соединение.

(define (echo-once server)
  (error 'net "ЗАДАНИЕ: прими соединение, прочитай и верни сообщение назад"))
---tests
(define server (tcp-listen 0))
(define port (local-port server))
(define server-thread
  (fork-thread (lambda () (echo-once server))))
(define client (tcp-connect "127.0.0.1" port))
(define sent (socket-send client (string->utf8 "привет, сеть")))
(define reply (utf8->string (socket-receive client 1024)))

(socket-close! client)
(thread-join server-thread)
(socket-close! server)

(zchm-check-equal "сервер вернул сообщение как есть" reply "привет, сеть")