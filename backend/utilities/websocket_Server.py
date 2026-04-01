from fastapi import APIRouter,WebSocket
from .Job_Notification import manager,userjobmanager
import json
import asyncio
from .operations import handle_job_request,Jobnotification
wbserver=APIRouter()



@wbserver.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(user_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()

            try:
                payload = json.loads(data)
            except json.JSONDecodeError:
                await websocket.send_text("Invalid JSON format")
                continue
            if payload.get("type") == "JOB_RESPONSE":
                try:
                    result = await handle_job_request(payload, user_id)
                    if result:
                        await websocket.send_text(f"Result: {result}")
                except Exception as e:
                    print("JOB_RESPONSE error:", e)
                    await websocket.send_text("Failed to process job response")

    except Exception as e:
        print(f"WebSocket error for user {user_id}:", e)
    finally:
        manager.disconnect(user_id)

@wbserver.websocket("/ws/user/job/{job_id}")
async def user_ws(websocket:WebSocket,job_id:int):
    await userjobmanager.connect(job_id,websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        await userjobmanager.disconnect(job_id)