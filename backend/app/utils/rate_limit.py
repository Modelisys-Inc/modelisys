"""Simple in-memory rate limiter for API endpoints."""
import time
from collections import defaultdict
from threading import Lock
from typing import Callable

from fastapi import HTTPException, Request, status


class RateLimiter:
    """
    Token bucket rate limiter.

    Tracks requests per IP address and enforces rate limits.
    Note: For production with multiple workers, use Redis-based rate limiting.
    """

    def __init__(self, requests_per_minute: int = 10, burst: int = 5):
        self.requests_per_minute = requests_per_minute
        self.burst = burst
        self.tokens: dict[str, float] = defaultdict(lambda: float(burst))
        self.last_update: dict[str, float] = defaultdict(time.time)
        self.lock = Lock()

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxies."""
        # Check X-Forwarded-For header first (for proxies/load balancers)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        # Fall back to client host
        return request.client.host if request.client else "unknown"

    def _refill_tokens(self, key: str) -> None:
        """Refill tokens based on time elapsed."""
        now = time.time()
        elapsed = now - self.last_update[key]
        # Add tokens based on time elapsed (tokens per second)
        tokens_to_add = elapsed * (self.requests_per_minute / 60.0)
        self.tokens[key] = min(self.burst, self.tokens[key] + tokens_to_add)
        self.last_update[key] = now

    def is_allowed(self, request: Request) -> bool:
        """Check if request is allowed under rate limit."""
        key = self._get_client_ip(request)

        with self.lock:
            self._refill_tokens(key)

            if self.tokens[key] >= 1:
                self.tokens[key] -= 1
                return True
            return False

    def check(self, request: Request) -> None:
        """Raise HTTPException if rate limit exceeded."""
        if not self.is_allowed(request):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": "60"},
            )


# Pre-configured rate limiters
auth_rate_limiter = RateLimiter(requests_per_minute=10, burst=5)  # Strict for auth
api_rate_limiter = RateLimiter(requests_per_minute=60, burst=20)  # More lenient for API
