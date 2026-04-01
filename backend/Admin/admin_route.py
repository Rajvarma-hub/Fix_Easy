from fastapi import APIRouter,HTTPException,status,Depends
from sqlalchemy.orm import Session
from utilities.database import Admins,ServiceCategories,get_db,Workers,JobAssignments,Status,Payments,Reviews,WorkerStatus
from .admin_models import AdminLogin,AdminSignup,service_categories,Services_price,DeleteUser,FetchworkerDetails
from utilities.oauth import get_current_admin,hash_password
from datetime import date,time,timezone,datetime
from sqlalchemy import func
import calendar

adroute=APIRouter(prefix="/admin")

@adroute.post("/signup")
def Usersignup(inp:AdminSignup,db:Session=Depends(get_db)):
    record=db.query(Admins).filter(Admins.email==inp.email).first()
    if record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Email Already Exists")
    new_record=Admins(
        name=inp.name,
        email=inp.email,
         password=hash_password(inp.password)
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record.id
    



@adroute.post("/AddService_Categories")
def AddServiceCategories(inp:service_categories,db:Session=Depends(get_db),current_user=Depends(get_current_admin)):
    record=db.query(ServiceCategories).filter(ServiceCategories.name==inp.name).first()
    if record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Category Already Exists")
    record=ServiceCategories(
        name=inp.name,
        base_price=inp.base_price,
        description=inp.description
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"record_id":record.id,"Status":"Successful"}

  
@adroute.get("/Service_categories")
def service_categories(db:Session=Depends(get_db)):
    records=db.query(ServiceCategories).all()
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="No records Found")
    
    return records

@adroute.get("/workers")
def getWorkers(db: Session = Depends(get_db),current_user=Depends(get_current_admin)):
    record = db.query(Workers).all()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No records Found"
        )
    result = []

    for worker in record:
        status_obj = worker.status
        capability = status_obj.worker_capability if status_obj else []
        capability_names = (
            db.query(ServiceCategories.name)
            .filter(ServiceCategories.id.in_(capability))
            .all()
        )
        capability_names = [name for (name,) in capability_names]
        result.append({
            "id": worker.id,
            "name": worker.name,
            "dob": worker.dob,
            "phone": worker.phone,
            "email": worker.email,
            "is_active": status_obj.is_active if status_obj else False,
            "capabilities": capability_names
        })

    return result



@adroute.delete("/DeleteWorker")
def Delete_worker(inp:DeleteUser,db:Session=Depends(get_db),current_user=Depends(get_current_admin)):
    record=db.query(Workers).filter(Workers.id==inp.id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Not Found")
    db.delete(record)
    db.commit()
    return "Deleted successfully"

@adroute.get("/GetWorkerDetails")
def get_worker_details(worker_id: int,db: Session = Depends(get_db),current_user=Depends(get_current_admin)):
    personal_details = (
        db.query(Workers)
        .filter(Workers.id == worker_id)
        .first()
    )

    if not personal_details:
        raise HTTPException(status_code=404, detail="Not found")

    per_dic = {
        "id": personal_details.id,
        "name": personal_details.name,
        "dob": personal_details.dob,
        "phone": personal_details.phone,
        "email": personal_details.email
    }

    status = personal_details.status.is_active
    capability = personal_details.status.worker_capability or []

    worker_capability_names = (
        db.query(ServiceCategories.name)
        .filter(ServiceCategories.id.in_(capability))
        .all()
    )
    worker_capability_names = [name for (name,) in worker_capability_names]

    jobs_done = (
        db.query(JobAssignments, Payments)
        .join(Payments, Payments.job_id == JobAssignments.job_id)
        .filter(JobAssignments.worker_id == worker_id)
        .all()
    )

    completed = []
    cancelled = []
    amount_earned = 0

    for job_assign, payment in jobs_done:
        if job_assign.job.status == Status.COMPLETED:
            amount_earned += payment.amount
            completed.append(job_assign.job_id)
        elif job_assign.job.status == Status.CANCELLED:
            cancelled.append(job_assign.job_id)

    reviews = (
        db.query(Reviews.rating)
        .filter(Reviews.worker_id == worker_id)
        .all()
    )

    if reviews:
        avg_rating = round(sum(r[0] for r in reviews) / len(reviews), 2)
    else:
        avg_rating = 0

    return {
        "personal_details": per_dic,
        "is_active": status,
        "capabilities": worker_capability_names,
        "jobs": {
            "completed": completed,
            "cancelled": cancelled
        },
        "amount_earned": amount_earned,
        "average_rating": avg_rating
    }

@adroute.get("/WhereIsWorker")
def get_worker_location(worker_id:int,db:Session=Depends(get_db),current_user=Depends(get_current_admin)):
    record=db.query(WorkerStatus).filter(WorkerStatus.worker_id==worker_id).first()
    if not record:
        raise HTTPException(status_code=404,detail="Not Found")
    return {
        "latitude":record.latitude,
        "longitude":record.longitude
    }

@adroute.get("/TodayRevenue")
def TodaysRevenue(db:Session=Depends(get_db),current_user=Depends(get_current_admin)):
    today=date.today()
    st_time=datetime.combine(today,time.min)
    end_time=datetime.combine(today,time.max)
    total_amount=db.query(func.coalesce(func.sum(Payments.platform_fee),0)).select_from(Payments).filter(Payments.created_at.between(st_time,end_time)).scalar()
    return {"todays_earing":total_amount}

@adroute.get("/MonthlyRevenue")
def MonthlyRevenue(db: Session = Depends(get_db),current_user=Depends(get_current_admin)):
    today = date.today()

    first_day_date = today.replace(day=1)
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    last_day_date = today.replace(day=days_in_month)

    first_day = datetime.combine(first_day_date, time.min)
    last_day = datetime.combine(last_day_date, time.max)

    total_amount = (
        db.query(func.coalesce(func.sum(Payments.platform_fee), 0))
        .filter(Payments.created_at.between(first_day, last_day))
        .scalar()
    )

    return {"monthly_amount": total_amount}
