from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_client_ip(request: Request) -> str:
    """
    Behind nginx, the direct TCP peer is nginx itself, so fall back to the
    client IP nginx forwards via X-Forwarded-For (set with
    `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`).
    The header can be a comma-separated chain if there are multiple
    proxies — the first entry is the original client.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=get_client_ip)
