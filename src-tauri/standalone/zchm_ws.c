typedef unsigned int SOCKET;
#define WSAAPI __stdcall
typedef unsigned int HANDLE_ISH;

SOCKET WSAAPI socket(int af, int type, int proto);
int WSAAPI bind(SOCKET s, const void *addr, int len);
int WSAAPI listen(SOCKET s, int backlog);
SOCKET WSAAPI accept(SOCKET s, void *addr, void *addrlen);
int WSAAPI connect(SOCKET s, const void *addr, int len);
int WSAAPI send(SOCKET s, const void *buf, int len, int flags);
int WSAAPI recv(SOCKET s, void *buf, int len, int flags);
int WSAAPI sendto(SOCKET s, const void *buf, int len, int flags, const void *to, int tolen);
int WSAAPI recvfrom(SOCKET s, void *buf, int len, int flags, void *from, void *fromlen);
int WSAAPI closesocket(SOCKET s);
int WSAAPI getsockname(SOCKET s, void *addr, void *addrlen);
int WSAAPI WSAStartup(int version, void *data);
int WSAAPI WSAGetLastError(void);

__declspec(dllexport) int zchm_wsa_start(void) {
    char data[512];
    return WSAStartup(0x0202, data);
}

__declspec(dllexport) unsigned int zchm_socket(int af, int type, int proto) {
    return (unsigned int)socket(af, type, proto);
}

__declspec(dllexport) int zchm_bind(unsigned int s, const char *addr, int len) {
    return bind((SOCKET)s, addr, len);
}

__declspec(dllexport) int zchm_listen(unsigned int s, int backlog) {
    return listen((SOCKET)s, backlog);
}

__declspec(dllexport) unsigned int zchm_accept(unsigned int s, char *addr, char *addrlen) {
    return (unsigned int)accept((SOCKET)s, addr, addrlen);
}

__declspec(dllexport) int zchm_connect(unsigned int s, const char *addr, int len) {
    return connect((SOCKET)s, addr, len);
}

__declspec(dllexport) int zchm_send(unsigned int s, const char *buf, int len, int flags) {
    return (int)send((SOCKET)s, buf, len, flags);
}

__declspec(dllexport) int zchm_recv(unsigned int s, char *buf, int len, int flags) {
    return (int)recv((SOCKET)s, buf, len, flags);
}

__declspec(dllexport) int zchm_sendto(unsigned int s, const char *buf, int len, int flags,
                                      const char *to, int tolen) {
    return (int)sendto((SOCKET)s, buf, len, flags, to, tolen);
}

__declspec(dllexport) int zchm_recvfrom(unsigned int s, char *buf, int len, int flags,
                                        char *from, char *fromlen) {
    return (int)recvfrom((SOCKET)s, buf, len, flags, (void *)from, fromlen);
}

__declspec(dllexport) int zchm_closesocket(unsigned int s) {
    return closesocket((SOCKET)s);
}

__declspec(dllexport) int zchm_getsockname(unsigned int s, char *addr, char *addrlen) {
    return getsockname((SOCKET)s, addr, addrlen);
}

__declspec(dllexport) int zchm_last_error(void) {
    return WSAGetLastError();
}

