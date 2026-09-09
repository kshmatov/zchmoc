---
id: net-echo-server
title: "Урок 4. Эхо-сервер"
track: network
order: 4
skills:
  - tcp
  - server
---

## Несколько соединений подряд

Прошлые уроки разбирали одно соединение. Настоящий сервер обслуживает многих клиентов: принимает соединение, обрабатывает, закрывает — и повторяет цикл. Бесконечный цикл здесь нормален: тест дождётся, когда сервер примет нужное число клиентов, и прекратит работу.

```scheme
(define (serve listener handler-count)
  (let loop ((n handler-count))
    (when (> n 0)
      (let ((conn (tcp-accept listener)))
        ;; обработать соединение...
        (socket-close! conn)
        (loop (- n 1))))))
```

В прототипе сервера подразумевается, что `tcp-accept` живёт внутри потока: тест запускает сервер через `fork-thread`, а главный поток в это время подключается клиентами.

## Задание

Реализуй `echo-server`: принять некоторое число соединений и каждое обслужить как эхо — прочитать сообщение и отправить его же обратно.

---starter
; Сеть · Урок 4 — Эхо-сервер
;
; ЗАДАНИЕ: echo-server принимает listener и число соединений (>= 0).
; Прими ровно столько соединений, каждое обслужи: прочитай сообщение
; (до 1024 байт), отправь его же обратно и закрой соединение.
; В конце верни общее количество отправленных байт.

(define (echo-server listener count)
  (error 'net "ЗАДАНИЕ: обслужи count соединений эхом и верни сумму байт"))
---tests
(define server (tcp-listen 0))
(define port (local-port server))

(define answers (box '()))
(define server-thread
  (fork-thread
    (lambda ()
      (let ((sent (echo-server server 3)))
        (set-box! answers sent)))))

(define (client-message text)
  (let ((c (tcp-connect "127.0.0.1" port)))
    (socket-send c (string->utf8 text))
    (let ((r (utf8->string (socket-receive c 1024))))
      (socket-close! c)
      r)))

(define r1 (client-message "раз"))
(define r2 (client-message "два"))
(define r3 (client-message "три"))
(thread-join server-thread)
(socket-close! server)

(zchm-check-equal "первый ответ" r1 "раз")
(zchm-check-equal "второй ответ" r2 "два")
(zchm-check-equal "третий ответ" r3 "три")
(zchm-check-equal "сервер отчитался о количестве байт" (unbox answers) 18)