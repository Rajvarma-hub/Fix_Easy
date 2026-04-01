from .model import *
from .Job_Notification import manager, userjobmanager
from .database import *
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
import secrets
import asyncio
import logging
import os
import math
import redis.asyncio as redis
from datetime import datetime, timezone
from runtime import app_loop

log = logging.getLogger(__name__)

r = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    db=0,
    decode_responses=True,
)

redis_client = r
OTP_TTL = 24 * 60 * 60


def otp_key(job_id):
    return f"otp:job:{job_id}"


def Jobnotification(payload, app_loop):
    db = next(get_db())
    try:
        service_id = payload.get("service_id")
        job_id = payload.get("service_request_id")
        loc = payload.get("service_location", {})
        lat = loc.get("latitude")
        lng = loc.get("longitude")

        if lat is None or lng is None:
            raise ValueError("missing lat/lng in payload")

        workers = find_nearest_workers(db, lat, lng, service_id, ActiveStatus.ONLINE)

        if workers:
            asyncio.run_coroutine_threadsafe(
                manager.broadcast(workers, {
                    "type": "JOB_NOTIFICATION",
                    "message": "You have a job notification",
                    "payload": payload,
                }),
                app_loop
            )
            return

        busy = find_nearest_workers(db, lat, lng, service_id, ActiveStatus.ASSIGNED)
        if not busy:
            return

        for wid in busy:
            asyncio.run_coroutine_threadsafe(
                r.sadd(f"worker_wait:{wid}", job_id), app_loop
            )

    except Exception as e:
        log.exception("Jobnotification error: %s", e)
    finally:
        db.close()


def generate_otp():
    return str(secrets.randbelow(10**6)).zfill(6)


async def store_otp(job_id, otp):
    await r.set(otp_key(job_id), otp, ex=OTP_TTL)


async def fetch_otp(job_id):
    key = otp_key(job_id)
    pipe = r.pipeline()
    pipe.get(key)
    pipe.ttl(key)
    val, ttl = await pipe.execute()
    if val:
        await r.expire(key, OTP_TTL)
    return val, ttl


async def handle_job_request(payload, worker_id):
    sr_id = payload["service_request_id"]
    action = payload["action"].lower()
    db = next(get_db())
    try:
        job = db.query(ServiceRequest).filter(ServiceRequest.id == sr_id).with_for_update().first()

        if not job:
            return "Job not found"

        if action == "accept":
            if job.status != Status.PENDING:
                return "Job accepted by someone else"

            job.status = Status.ASSIGNED
            a = JobAssignments(job_id=job.id, worker_id=worker_id, accepted=True)

            ws = db.query(WorkerStatus).filter(WorkerStatus.worker_id == worker_id).first()
            if not ws:
                return "Worker not found"

            ws.is_active = ActiveStatus.ASSIGNED
            db.add(a)
            db.commit()
            db.refresh(a)

            otp = generate_otp()
            await store_otp(job.id, otp)

            await userjobmanager.notify_user(job.id, {
                "type": "Job_Accepted",
                "job_id": job.id,
                "worker_name": a.worker.name,
                "worker_id": worker_id,
                "worker_phone": a.worker.phone,
                "Status": "Assigned",
                "Otp": otp,
            })
            return "Job successfully accepted"

        elif action == "reject":
            return "Job rejected"

        return "Invalid action"

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


async def cancel_job_by_user(job_id):
    db = next(get_db())
    try:
        job = db.query(ServiceRequest).filter(ServiceRequest.id == job_id).with_for_update().first()

        if not job:
            return "Job not found"
        if job.status == Status.CANCELLED:
            return "Job already cancelled"

        w_id = job.assignment.worker_id if job.assignment else None
        job.status = Status.CANCELLED
        job.completed_time = datetime.now(timezone.utc)

        if w_id:
            ws = db.query(WorkerStatus).filter(WorkerStatus.worker_id == w_id).first()
            if ws:
                ws.is_active = ActiveStatus.ONLINE

        db.commit()
        await r.delete(otp_key(job_id))

        msg = {"type": "JOB_CANCELLED", "job_id": job_id, "cancelled_by": "USER"}
        await userjobmanager.notify_user(job_id, msg)
        await userjobmanager.disconnect(job_id)

        if w_id:
            await manager.broadcast([w_id], msg)
            await check_queued_job(w_id, app_loop)

        return "Job cancelled successfully"

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


async def cancel_job_by_worker(job_id, worker_id):
    db = next(get_db())
    try:
        job = db.query(ServiceRequest).filter(ServiceRequest.id == job_id).with_for_update().first()

        if not job:
            return "Job not found"
        if job.status != Status.ASSIGNED:
            return "Job is not active"
        if not job.assignment or job.assignment.worker_id != worker_id:
            return "You are not assigned to this job"

        job.status = Status.CANCELLED
        job.completed_time = datetime.now(timezone.utc)

        ws = db.query(WorkerStatus).filter(WorkerStatus.worker_id == worker_id).first()
        if ws:
            ws.is_active = ActiveStatus.ONLINE

        db.commit()
        await r.delete(otp_key(job_id))

        msg = {"type": "JOB_CANCELLED", "job_id": job_id, "cancelled_by": "WORKER"}
        await userjobmanager.notify_user(job_id, msg)
        await userjobmanager.disconnect(job_id)
        await manager.broadcast([worker_id], msg)

        return "Job cancelled by worker"

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def notify_woker_payment(payload, app_loop):
    try:
        w_id = payload.get("worker_id")
        if not w_id:
            return
        asyncio.run_coroutine_threadsafe(
            manager.broadcast([int(w_id)], payload), app_loop
        )
    except Exception as e:
        log.exception("notify_worker_payment error: %s", e)


def calc_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


RADII = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0]
MAX_WORKERS = 10


def find_nearest_workers(db, lat, lng, service_id, status, max_w=MAX_WORKERS):
    all_ws = db.query(WorkerStatus).filter(
        WorkerStatus.is_active == status,
        WorkerStatus.latitude.isnot(None),
        WorkerStatus.longitude.isnot(None),
    ).all()

    found = {}
    for radius in RADII:
        for ws in all_ws:
            if ws.worker_id in found or service_id not in ws.worker_capability:
                continue
            d = calc_distance(lat, lng, ws.latitude, ws.longitude)
            if d <= radius:
                found[ws.worker_id] = d
        if len(found) >= max_w:
            break

    return [wid for wid, _ in sorted(found.items(), key=lambda x: x[1])[:max_w]]


async def check_queued_job(worker_id, app_loop):
    db = next(get_db())
    try:
        ids = await r.smembers(f"worker_wait:{worker_id}")
        if not ids:
            return

        job_id = min(map(int, ids))
        job = db.query(ServiceRequest).filter(ServiceRequest.id == job_id).first()

        if not job or job.status != Status.PENDING:
            await r.srem(f"worker_wait:{worker_id}", job_id)
            return

        await r.srem(f"worker_wait:{worker_id}", job_id)
        await manager.broadcast([worker_id], {
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
                    "country": job.location.country,
                },
                "service_description": job.description,
            },
        })
    finally:
        db.close()


check_and_process_queued_job = check_queued_job