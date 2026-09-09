;;; sockets.ss — дружелюбный сокетный API поверх zchm_ws.dll.
;;; Загружается sidecar-ом перед программой игрока (потоковая сборка Chez).
;;; Только Windows, только IPv4, блокирующие операции.

; --- FFI: тонкие врапперы через zchm_ws.dll (cdecl) ---

(define $zchm-socket-raw
  (foreign-procedure "zchm_socket" (int int int) int))
(define $zchm-bind-raw
  (foreign-procedure "zchm_bind" (int u8* int) int))
(define $zchm-listen-raw
  (foreign-procedure "zchm_listen" (int int) int))
(define $zchm-accept-raw
  (foreign-procedure "zchm_accept" (int u8* u8*) int))
(define $zchm-connect-raw
  (foreign-procedure "zchm_connect" (int u8* int) int))
(define $zchm-send-raw
  (foreign-procedure "zchm_send" (int u8* int int) int))
(define $zchm-recv-raw
  (foreign-procedure "zchm_recv" (int u8* int int) int))
(define $zchm-sendto-raw
  (foreign-procedure "zchm_sendto" (int u8* int int u8* int) int))
(define $zchm-recvfrom-raw
  (foreign-procedure "zchm_recvfrom" (int u8* int int u8* u8*) int))
(define $zchm-close-raw
  (foreign-procedure "zchm_closesocket" (int) int))
(define $zchm-getsockname-raw
  (foreign-procedure "zchm_getsockname" (int u8* u8*) int))
(define $zchm-lasterror-raw
  (foreign-procedure "zchm_last_error" () int))
(define $zchm-wsa-start-raw
  (foreign-procedure "zchm_wsa_start" () int))

(let ((code ($zchm-wsa-start-raw)))
  (unless (= code 0)
    (error 'sockets "WSAStartup не завершился успешно" code)))

; --- константы ---

(define $af-inet 2)
(define $sock-stream 1)
(define $sock-dgram 2)

; --- байтовые хелперы ---

(define (zchm-byte n) (bitwise-and n 255))

(define (zchm-ip-bytes host)
  (map (lambda (s) (string->number s))
       (zchm-split-string host #\.)))

(define (zchm-split-string s c)
  (define (index start)
    (let loop ((i start))
      (cond
        ((>= i (string-length s)) #f)
        ((char=? (string-ref s i) c) i)
        (else (loop (+ i 1))))))
  (let loop ((i 0) (acc '()))
    (let ((j (index i)))
      (if j
          (loop (+ j 1) (cons (substring s i j) acc))
          (reverse (cons (substring s i (string-length s)) acc))))))

;; Структура sockaddr_in (16 байт) для IPv4-сокета.
(define (zchm-sockaddr host port)
  (let ((bv (make-bytevector 16 0))
        (octets (zchm-ip-bytes host)))
    (bytevector-u8-set! bv 0 2)                       ; sin_family = AF_INET
    (bytevector-u8-set! bv 1 0)
    (bytevector-u8-set! bv 2 (zchm-byte
                              (bitwise-arithmetic-shift-right port 8)))
    (bytevector-u8-set! bv 3 (zchm-byte port))        ; порт в сетевом порядке
    (for-each (lambda (i)
                (bytevector-u8-set! bv (+ 4 i) (list-ref octets i)))
              '(0 1 2 3))
    bv))

(define (zchm-sockaddr-port addr)
  (+ (* (bytevector-u8-ref addr 2) 256)
     (bytevector-u8-ref addr 3)))

(define (zchm-sockaddr-ip addr)
  (string-append
   (number->string (bytevector-u8-ref addr 4)) "."
   (number->string (bytevector-u8-ref addr 5)) "."
   (number->string (bytevector-u8-ref addr 6)) "."
   (number->string (bytevector-u8-ref addr 7))))

; Позиция первого вхождения подстроки sub в строку s (или #f).
(define (zchm-string-index s sub)
  (let ((n (string-length s))
        (m (string-length sub)))
    (let loop ((i 0))
      (cond
        ((= m 0) 0)
        ((>= i n) #f)
        ((and (<= (+ i m) n)
              (string=? (substring s i (+ i m)) sub))
         i)
        (else (loop (+ i 1)))))))

; Тело HTTP-ответа: всё, что после первой пустой строки (\r\n\r\n).
(define (zchm-http-body response)
  (let ((sep "\r\n\r\n")
        (n (string-length response)))
    (let ((i (zchm-string-index response "\r\n\r\n")))
      (if (and i (< (+ i 4) n))
          (substring response (+ i 4) n)
          response))))

; Склеивает список байтвекторов в один (порядок сохраняется).
(define (zchm-concat-bytes lst)
  (if (null? lst)
      #vu8()
      (let* ((total (apply + (map bytevector-length lst)))
             (out (make-bytevector total)))
        (let loop ((i 0) (rest lst))
          (if (null? rest)
              out
              (let ((chunk (car rest)))
                (bytevector-copy! chunk 0 out i (bytevector-length chunk))
                (loop (+ i (bytevector-length chunk)) (cdr rest))))))))

(define (zchm-socket-error! who)
  (error who "ошибка сокета" ($zchm-lasterror-raw)))

; --- дружелюбный API для уроков ---

; Создаёт серверный сокет: слушает порт (0 — любой свободный).
(define (tcp-listen port)
  (let ((s ($zchm-socket-raw $af-inet $sock-stream 0)))
    (when (< s 0) (zchm-socket-error! 'tcp-listen))
    (unless (= 0 ($zchm-bind-raw s (zchm-sockaddr "0.0.0.0" port) 16))
      ($zchm-close-raw s)
      (zchm-socket-error! 'tcp-listen))
    (unless (= 0 ($zchm-listen-raw s 8))
      ($zchm-close-raw s)
      (zchm-socket-error! 'tcp-listen))
    s))

; Порт, на котором слушает сокет (для порта 0 — реально занятый).
(define (local-port socket)
  (let ((addr (make-bytevector 16 0))
        (len (make-bytevector 4 0)))
    (bytevector-u32-native-set! len 0 16)
    (unless (= 0 ($zchm-getsockname-raw socket addr len))
      (zchm-socket-error! 'local-port))
    (zchm-sockaddr-port addr)))

; Блокирующий приём входящего TCP-соединения.
(define (tcp-accept listener)
  (let ((addr (make-bytevector 16 0))
        (len (make-bytevector 4 0)))
    (bytevector-u32-native-set! len 0 16)
    (let ((c ($zchm-accept-raw listener addr len)))
      (when (< c 0) (zchm-socket-error! 'tcp-accept))
      c)))

; TCP-клиент: соединяется с host:port.
(define (tcp-connect host port)
  (let ((s ($zchm-socket-raw $af-inet $sock-stream 0)))
    (when (< s 0) (zchm-socket-error! 'tcp-connect))
    (unless (= 0 ($zchm-connect-raw s (zchm-sockaddr host port) 16))
      ($zchm-close-raw s)
      (zchm-socket-error! 'tcp-connect))
    s))

; UDP-сокет.
(define (udp-socket)
  (let ((s ($zchm-socket-raw $af-inet $sock-dgram 0)))
    (when (< s 0) (zchm-socket-error! 'udp-socket))
    s))

; Привязывает UDP-сокет к порту (0 — любой свободный).
(define (udp-bind! socket port)
  (unless (= 0 ($zchm-bind-raw socket (zchm-sockaddr "0.0.0.0" port) 16))
    (zchm-socket-error! 'udp-bind!)))

; Отправляет байтвектор по TCP-сокету.
(define (socket-send socket bv)
  (let ((n ($zchm-send-raw socket bv (bytevector-length bv) 0)))
    (when (< n 0) (zchm-socket-error! 'socket-send))
    n))

; Блокирующее чтение из TCP-сокета.
; Возвращает байтвектор; #vu8() — соединение закрыто другой стороной.
(define (socket-receive socket maxlen)
  (let ((buf (make-bytevector maxlen)))
    (let ((n ($zchm-recv-raw socket buf maxlen 0)))
      (cond
        ((< n 0) (zchm-socket-error! 'socket-receive))
        ((= n 0) #vu8())
        (else
         (let ((out (make-bytevector n)))
           (bytevector-copy! buf 0 out 0 n)
           out))))))

; Отправляет датаграмму на UDP-адрес.
(define (udp-send-to socket host port bv)
  (let ((n ($zchm-sendto-raw socket bv (bytevector-length bv) 0
                             (zchm-sockaddr host port) 16)))
    (when (< n 0) (zchm-socket-error! 'udp-send-to))
    n))

; Блокирующий приём датаграммы: (list байтвектор адрес-кто-отправил порт).
(define (udp-receive-from socket)
  (let ((buf (make-bytevector 65535))
        (addr (make-bytevector 16 0))
        (len (make-bytevector 4 0)))
    (bytevector-u32-native-set! len 0 16)
    (let ((n ($zchm-recvfrom-raw socket buf 65535 0 addr len)))
      (when (< n 0) (zchm-socket-error! 'udp-receive-from))
      (let ((out (make-bytevector n)))
        (bytevector-copy! buf 0 out 0 n)
        (list out (zchm-sockaddr-ip addr) (zchm-sockaddr-port addr))))))

; Закрывает сокет.
(define (socket-close! socket)
  ($zchm-close-raw socket))