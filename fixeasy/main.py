from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import threading
from runtime import app_loop,stop_event
from microservices.consumer import start_consumer, stop_event
from utilities.websocket_Server import wbserver
from Users.user_route import router
from Admin.admin_route import adroute
from Workers.worker_route import wrrouter
from utilities.oauth import oauthrouter
from utilities.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="wokers")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


consumer_thread = None

@app.on_event("startup")
async def startup_event():
    global consumer_thread

    app_loop = asyncio.get_running_loop()  
    consumer_thread = threading.Thread(
        target=start_consumer,
        args=(stop_event, app_loop),
        daemon=True
    )
    consumer_thread.start()


@app.on_event("shutdown")
def shutdown_event():
    stop_event.set()
    consumer_thread.join()



app.include_router(router)
app.include_router(adroute)
app.include_router(wrrouter)
app.include_router(wbserver)
app.include_router(oauthrouter)
