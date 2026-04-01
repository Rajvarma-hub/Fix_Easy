from fastapi import WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections = {}
        self.app = None

    def set_app(self, app):
        self.app = app

    async def connect(self, user_id: int, websocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            self.active_connections.pop(user_id)

    async def broadcast(self, user_ids, message):
        for uid in user_ids:
            ws = self.active_connections.get(uid)
            if not ws:
                continue

            try:
                await ws.send_json(message)
            except WebSocketDisconnect:
                self.disconnect(uid)

class UserJobSocket:
    def __init__(self):
        self.job_user_ws = {}

    async def connect(self, job_id: int, websocket):
        await websocket.accept()
        self.job_user_ws[job_id] = websocket
        print(f"User connected for job_id {job_id}")

    async def disconnect(self, job_id: int):
        ws = self.job_user_ws.pop(job_id, None)
        if ws:
            try:
                await ws.close(code=1000)
            except Exception:
                pass

    async def notify_user(self, job_id: int, message):
        ws = self.job_user_ws.get(job_id)
        if not ws:
            return False

        try:
            await ws.send_json(message)
            return True
        except WebSocketDisconnect:
            self.disconnect(job_id)
            return False

manager = ConnectionManager()
userjobmanager = UserJobSocket()
