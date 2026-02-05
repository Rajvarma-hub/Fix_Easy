from fastapi import APIRouter,HTTPException,status,Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, time,timezone
import calendar
from .workerModels import workerSignup,workerLogin,UpdateWorkerStatus,addWorkercapability,Canceljob,Workcompleted,Update_worker_details
from utilities.database import get_db,Workers,WorkerStatus,ServiceRequest,Status,JobAssignments,Payments,Reviews,ActiveStatus
from utilities.operations import cancel_job_by_worker,redis_client
from utilities.oauth import get_current_worker,hash_password
from utilities.Job_Notification import userjobmanager
wrrouter=APIRouter(prefix="/Workers")

@wrrouter.post("/signup")
def Usersignup(inp:workerSignup,db:Session=Depends(get_db)):
    record=db.query(Workers).filter(Workers.email==inp.email).first()
    if record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Email Already Exists")
    new_record=Workers(
        name=inp.name,
        dob=inp.dob,
        phone=inp.phone,
        email=inp.email,
         password=hash_password(inp.password),
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record.id
    
@wrrouter.post("/AddWorkerCapability")
def AddworkerCapability(cap:addWorkercapability,db:Session=Depends(get_db),current_user = Depends(get_current_worker)):
    record=db.query(WorkerStatus).filter(WorkerStatus.worker_id==current_user.id).first()
    if not record:
        record=WorkerStatus(
            worker_id=current_user.id,
            worker_capability=cap.worker_capability
        )
        db.add(record)
        db.commit()
    merged=list(set(cap.worker_capability)|set(record.worker_capability))
    record.worker_capability=merged
    db.commit()
    return {"message":"Added Successfully"}

@wrrouter.get("/Profile_details")
def get_profile_details(db:Session=Depends(get_db),current_user = Depends(get_current_worker)):
    return {
        "name":current_user.name,
        "dob":current_user.dob,
        "email":current_user.email,
        "phone":current_user.phone
    }

@wrrouter.post("/update_name")
def Update_name(inp:Update_worker_details,db:Session=Depends(get_db),current_user = Depends(get_current_worker)):
    record=db.query(Workers).filter(Workers.id==current_user.id).first()
    if not record:
        return "Details Not Found"
    updated_data=inp.dict(exclude_unset=True)
    for key,value in updated_data.items():
        if hasattr(record,key):
            setattr(record,key,value)
    db.commit()
    db.refresh(record)
    return {
        "message":"Updated Successfully",
        "data":record
    }
    

@wrrouter.get("/rating")
def get_rating(db: Session = Depends(get_db),current_user = Depends(get_current_worker)):
    records=db.query(Reviews).filter(Reviews.worker_id==current_user.id).all()
    if not records:
        return {"average_rating":"No Rating Yet"}
    avg_rating=sum(rec.rating for rec in records)/len(records)
    return {
        "Average_rating":avg_rating
    }


@wrrouter.get("/todays_earning")
def todays_earnings(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_worker)
):
    today = date.today()
    start_datetime = datetime.combine(today, time.min)
    end_datetime = datetime.combine(today, time.max)

    total_amount = (
        db.query(func.coalesce(func.sum(Payments.provider_amount), 0))
        .select_from(JobAssignments)
        .join(Payments, Payments.job_id == JobAssignments.job_id)
        .filter(
            JobAssignments.worker_id == current_user.id,
            Payments.created_at.between(start_datetime, end_datetime)
        )
        .scalar()
    )

    return {
        "message": "Today's Earnings",
        "amount": total_amount
    }

@wrrouter.get("/monthly_earning")
def monthly_earnings(db: Session = Depends(get_db),current_user = Depends(get_current_worker)):
    today = date.today()
    first_day = today.replace(day=1)
    last_day = today.replace(day=calendar.monthrange(today.year, today.month)[1])

    start_datetime = datetime.combine(first_day, time.min)
    end_datetime = datetime.combine(last_day, time.max)
    total_amount = (
        db.query(func.coalesce(func.sum(Payments.provider_amount), 0))
        .select_from(JobAssignments)
        .join(Payments, Payments.job_id == JobAssignments.job_id)
        .filter(
            JobAssignments.worker_id == current_user.id,
            Payments.created_at.between(start_datetime, end_datetime)
        )
        .scalar()
    )

    return {
        "message": "Monthly Earnings",
        "amount": total_amount
    }


@wrrouter.post("/workerStatus")
def UpdateworkerStatus(stat:UpdateWorkerStatus,db:Session=Depends(get_db),current_user = Depends(get_current_worker)):
    record=db.query(WorkerStatus).filter(WorkerStatus.worker_id==current_user.id).first()
    if not record:
        record.is_active=stat.is_active
        db.add(record)
        db.commit()
       
    record.is_active=stat.is_active
    db.commit()
    return {"Status":record.is_active}

@wrrouter.post("/workcompleted")
async def work_completed(inp: Workcompleted,db: Session = Depends(get_db),current_user = Depends(get_current_worker)):
    try:
        record = (
            db.query(ServiceRequest)
            .join(JobAssignments, JobAssignments.job_id == ServiceRequest.id)
            .filter(
                ServiceRequest.id == inp.job_id,
                JobAssignments.worker_id == current_user.id
            )
            .with_for_update()
            .first()
        )

        if not record:
            raise HTTPException(status_code=404, detail="Invalid Job")

        stored_otp = await redis_client.get(f"otp:job:{inp.job_id}")

        if not stored_otp:
            raise HTTPException(status_code=404, detail="OTP expired")

        if stored_otp != inp.otp:
            raise HTTPException(status_code=400, detail="Invalid OTP")

        record.status = Status.COMPLETED
        record.completed_time=datetime.now(timezone.utc)
        worker_rec=db.query(WorkerStatus).filter(WorkerStatus.worker_id==current_user.id).first()
        worker_rec.is_active=ActiveStatus.ONLINE
        db.commit()

        await redis_client.delete(f"otp:job:{inp.job_id}")

        await userjobmanager.disconnect(inp.job_id)
        return {"message": "Work Completed"}

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to complete work")


@wrrouter.post("/CancellJob")
async def cancel_job(inp:Canceljob,current_user = Depends(get_current_worker)):
    result = await cancel_job_by_worker(inp.job_id,current_user.id) 
    return {"message": result}


@wrrouter.get("/Jobs_completed")
def jobs_completed( db: Session = Depends(get_db),current_user = Depends(get_current_worker)):
    today = date.today()
    start_time = datetime.combine(today, time.min)
    end_time = datetime.combine(today, time.max)

    daily_records = (
        db.query(JobAssignments)
        .join(ServiceRequest, JobAssignments.job_id == ServiceRequest.id)
        .filter(
            JobAssignments.worker_id == current_user.id,
            ServiceRequest.status == Status.COMPLETED,
            ServiceRequest.requested_time.between(start_time, end_time)
        )
        .all()
    )

    daily_count = len(daily_records)

    completed_records = (
        db.query(JobAssignments)
        .join(ServiceRequest, JobAssignments.job_id == ServiceRequest.id)
        .filter(
            JobAssignments.worker_id == current_user.id,
            ServiceRequest.status == Status.COMPLETED
        )
        .all()
    )

    total_count = len(completed_records)

    cancelled_records = (
        db.query(JobAssignments)
        .join(ServiceRequest, JobAssignments.job_id == ServiceRequest.id)
        .filter(
            JobAssignments.worker_id == current_user.id,
            ServiceRequest.status == Status.CANCELLED
        )
        .all()
    )

    failed_count = len(cancelled_records)

    return {
        "daily_jobs": daily_count,
        "total_jobs": total_count,
        "cancelled_jobs": failed_count
    }
@wrrouter.get("/my_jobs")
def get_my_jobs(
    db: Session = Depends(get_db),
    current_worker = Depends(get_current_worker)
):
    assignments = (
        db.query(JobAssignments)
        .join(ServiceRequest, JobAssignments.job_id == ServiceRequest.id)
        .filter(
            JobAssignments.worker_id == current_worker.id,
            ServiceRequest.status.in_([
                Status.ASSIGNED,
                Status.COMPLETED
            ])
        )
        .all()
    )

    return [
        {
            "id": a.job.id,
            "service_name": a.job.service_category.name if a.job.service_category else "Unknown",
            "customer_name": a.job.customer.name if a.job.customer else "Unknown",
            "description": a.job.description,
            "location": (
                f"{a.job.location.house_no}, "
                f"{a.job.location.city}, "
                f"{a.job.location.state}"
                if a.job.location else "Unknown"
            ),
            "status": a.job.status.value,
            "accepted_at": a.assigned_time.isoformat() if a.assigned_time else None,
            "amount": a.job.service_category.base_price if a.job.service_category else 0
        }
        for a in assignments
    ]
@wrrouter.get("/pending_jobs")
def get_pending_jobs(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_worker)
):
    # Safety check
    if not current_user.status or not current_user.status.worker_capability:
        return []

    jobs = (
        db.query(ServiceRequest)
        .filter(
            ServiceRequest.status == Status.PENDING,
            ServiceRequest.service_id.in_(current_user.status.worker_capability)
        )
        .all()
    )

    result = []

    for job in jobs:
        result.append({
            "job_id": job.id,
            "service_name": job.service_category.name if job.service_category else "Unknown",
            "customer_name": job.customer.name if job.customer else "Unknown",
            "description": job.description,
            "location": job.location.house_no if job.location else None,
            "city": job.location.city if job.location else None,
            "state": job.location.state if job.location else None,
            "pincode": job.location.pincode if job.location else None,
            "country": job.location.country if job.location else None,
            "status": job.status.value,
            "requested_time": job.requested_time.isoformat() if job.requested_time else None
        })

    return result

    