import asyncio
import threading

app_loop: asyncio.AbstractEventLoop | None = None
stop_event = threading.Event()
