from .model import *
from .Job_Notification import manager,userjobmanager
from .database import *
from fastapi import HTTPException,status,Depends
from sqlalchemy.orm import Session
from sqlalchemy import any_,cast
import secrets
import asyncio
from runtime import app_loop
from typing import List
import redis.asyncio as redis
from datetime import datetime, timezone

redis_client = redis.Redis(
    host="localhost",  
    port=6379,
    db=0,
    decode_responses=True
)

def Jobnotification(payload, app_loop):
    db = next(get_db())
    try:
        service_id = payload.get("service_id")
        job_id = payload.get("service_request_id")

        location = payload.get("service_location", {})
        job_lat = location.get("latitude")
        job_lng = location.get("longitude")

        if job_lat is None or job_lng is None:
            raise ValueError("Job latitude or longitude is missing in payload")

        worker_ids = find_nearest_workers(
            db=db,
            job_lat=job_lat,
            job_lng=job_lng,
            service_id=service_id,
            status_filter=ActiveStatus.ONLINE
        )

        if worker_ids:
            message = {
                "type": "JOB_NOTIFICATION",
                "message": "You have a job notification",
                "payload": payload
            }

            asyncio.run_coroutine_threadsafe(
                manager.broadcast(worker_ids, message),
                app_loop
            )
            return

        busy_worker_ids = find_nearest_workers(
            db=db,
            job_lat=job_lat,
            job_lng=job_lng,
            service_id=service_id,
            status_filter=ActiveStatus.ASSIGNED
        )

        if not busy_worker_ids:
            return
        for wid in busy_worker_ids:
            asyncio.run_coroutine_threadsafe(redis_client.sadd(f"worker_wait:{wid}", job_id),app_loop)
            print(f"worker_wait:{wid},job_id:{job_id}")
    except Exception as e:
        print("Jobnotification failed:", e)

    finally:
        db.close()


def generate_otp():
    return str(secrets.randbelow(10**6)).zfill(6)


async def handle_job_request(payload: dict, worker_id: int):
    service_request_id = payload["service_request_id"]
    action = payload["action"].lower()
    db = next(get_db())
    try:
        record = (
            db.query(ServiceRequest)
            .filter(ServiceRequest.id == service_request_id)
            .with_for_update()
            .first()
        )

        if not record:
            return "Job not found"

        if action == "accept":
            if record.status != Status.PENDING:
                return "Job accepted by someone else"
            record.status = Status.ASSIGNED
            assignment = JobAssignments(
                job_id=record.id,
                worker_id=worker_id,
                accepted=True
            )
            wrrecrod=db.query(WorkerStatus).filter(WorkerStatus.worker_id==worker_id).first()
            if not wrrecrod:
                return "Worker Not Found"
            wrrecrod.is_active=ActiveStatus.ASSIGNED
            db.add(assignment)
            db.commit()
            db.refresh(assignment)
            value=generate_otp()
            await redis_client.set(
        f"otp:job:{record.id}",value
    )
            await userjobmanager.notify_user(
                record.id,{
                    "type":"Job_Accepted",
                    "job_id":record.id,
                    "worker_name":assignment.worker.name,
                    "Status":"Assigned",
                    "Otp":value
                }
            )
            return "Job successfully accepted"

        elif action == "reject":
            return "Job rejected"

        return "Invalid action"

    except Exception as e:
        db.rollback()
        raise e

    finally:
        db.close()

async def cancel_job_by_user(job_id: int):
    db = next(get_db())
    try:
        job = (
            db.query(ServiceRequest)
            .filter(ServiceRequest.id == job_id)
            .with_for_update()
            .first()
        )

        if not job:
            return "Job not found"

        if job.status == Status.CANCELLED:
            return "Job already cancelled"

        assigned_worker_id = None
        if job.assignment:
            assigned_worker_id = job.assignment.worker_id

        job.status = Status.CANCELLED
        job.completed_time = datetime.now(timezone.utc)

        if assigned_worker_id:
            record = (
                db.query(WorkerStatus)
                .filter(WorkerStatus.worker_id == assigned_worker_id)
                .first()
            )

            if record:
                record.is_active = ActiveStatus.ONLINE

        db.commit()

        payload = {
            "type": "JOB_CANCELLED",
            "job_id": job_id,
            "cancelled_by": "USER"
        }

        await userjobmanager.notify_user(job_id, payload)
        await userjobmanager.disconnect(job_id)

        if assigned_worker_id:
            await manager.broadcast([assigned_worker_id], payload)
            await check_and_process_queued_job(
                assigned_worker_id,
                app_loop
            )

        return "Job cancelled successfully"

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

async def cancel_job_by_worker(job_id: int, worker_id: int):
    db = next(get_db())
    try:
        job = (
            db.query(ServiceRequest)
            .filter(ServiceRequest.id == job_id)
            .with_for_update()
            .first()
        )

        if not job:
            return "Job not found"

        if job.status != Status.ASSIGNED:
            return "Job is not active"

        if not job.assignment or job.assignment.worker_id != worker_id:
            return "You are not assigned to this job"

        job.status = Status.CANCELLED
        job.completed_time=datetime.now(timezone)
        record=db.query(WorkerStatus).filter(WorkerStatus.worker_id==job.assignment.id).first()
        record.is_active=ActiveStatus.ONLINE
        db.commit()

        payload = {
            "type": "JOB_CANCELLED",
            "job_id": job_id,
            "cancelled_by": "WORKER"
        }

        await userjobmanager.notify_user(job_id, payload)
        await userjobmanager.disconnect(job_id)
        await manager.broadcast([worker_id], payload)

        return "Job cancelled by worker"

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def notify_woker_payment(payload:dict,apploop):
    try:
        print("notificatio arrived")
        worker_id=payload.get("worker_id")

        if not worker_id:
            return "Invalid worker Id"
        asyncio.run_coroutine_threadsafe(
            manager.broadcast([int(worker_id)],payload),apploop)
    except Exception as e:
        print("Error:",e)


import math
def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c

SEARCH_RADII = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0]
MIN_WORKERS_REQUIRED = 10

def find_nearest_workers(db: Session,job_lat: float,job_lng: float, service_id: int,status_filter: str, max_workers: int = MIN_WORKERS_REQUIRED) -> list[int]:

    workers = (
        db.query(WorkerStatus)
        .filter(
            WorkerStatus.is_active == status_filter,
            WorkerStatus.latitude.isnot(None),
            WorkerStatus.longitude.isnot(None)
        )
        .all()
    )

    collected = {}

    for radius in SEARCH_RADII:
        for ws in workers:
            if ws.worker_id in collected:
                continue

            if service_id not in ws.worker_capability:
                continue

            distance = calculate_distance_km(
                job_lat,
                job_lng,
                ws.latitude,
                ws.longitude
            )

            if distance <= radius:
                collected[ws.worker_id] = distance

        if len(collected) >= max_workers:
            break

    sorted_workers = sorted(collected.items(), key=lambda x: x[1])
    return [wid for wid, _ in sorted_workers[:max_workers]]



async def check_and_process_queued_job(worker_id: int, app_loop):
    db = next(get_db())
    try:
        job_ids = await redis_client.smembers(f"worker_wait:{worker_id}")
        print("from check and process",job_ids,worker_id)
        if not job_ids:
            return

        job_id = min(map(int, job_ids))

        job = (
            db.query(ServiceRequest)
            .filter(ServiceRequest.id == job_id)
            .first()
        )

        if not job or job.status != Status.PENDING:
            await redis_client.srem(f"worker_wait:{worker_id}", job_id)
            return

        message = {
            "type": "JOB_NOTIFICATION",
            "message": "You have a job notification",
            "payload": {
                "service_request_id": job.id,
                "service_id": job.service_id,
                "service_category": job.service_category.name,
                "service_location": {
                    "house_no": job.location.house_no,
                    "latitude": job.location.latitude,
                    "longitude": job.location.longitude,
                    "city": job.location.city,
                    "pincode": job.location.pincode,
                    "state": job.location.state,
                    "country": job.location.country
                },
                "service_description": job.description
            }
        }

        await redis_client.srem(f"worker_wait:{worker_id}", job_id)

        await manager.broadcast([worker_id], message)

    finally:
        db.close()
