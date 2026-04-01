from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from .usermodels import (
    userSignup, Servie_request, Add_Address, MakePayment,
    Canceljob, review, Update_Address, Update_user_details, generate_txn_id
)
from utilities.database import (
    get_db, Users, ServiceRequest, Locations,
    Payments, Reviews, JobAssignments, Status, PaymentMethod, PaymentStatus
)
from utilities.Job_Notification import manager
from microservices.producers import push_job_request
from utilities.oauth import get_current_user, hash_password
from Agents.userAgent import get_agent
from langchain_core.messages import HumanMessage
from utilities.operations import cancel_job_by_user, fetch_otp
import logging

log = logging.getLogger(__name__)
router = APIRouter(prefix="/users")


@router.post("/signup")
def Usersignup(inp: userSignup, db: Session = Depends(get_db)):
    if db.query(Users).filter(Users.email == inp.email).first():
        raise HTTPException(status_code=400, detail="Email Already Exists")
    u = Users(
        name=inp.name, dob=inp.dob, email=inp.email,
        password=hash_password(inp.password), phone=inp.phone,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u.id


@router.post("/AddAddress")
def add_address(inp: Add_Address, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    loc = Locations(
        user_id=current_user.id, house_no=inp.house_no,
        latitude=inp.latitude, longitude=inp.longitude,
        city=inp.city, pincode=inp.pincode,
        state=inp.state, country=inp.country,
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return {"Location_id": loc.id, "Status": "Success"}


@router.get("/Profile_details")
def get_profile(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return {
        "name": current_user.name,
        "dob": current_user.dob,
        "email": current_user.email,
        "phone": current_user.phone,
    }


@router.post("/update_name")
def update_name(inp: Update_user_details, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    u = db.query(Users).filter(Users.id == current_user.id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in inp.dict(exclude_unset=True).items():
        if hasattr(u, k):
            setattr(u, k, v)
    db.commit()
    db.refresh(u)
    return {"message": "Updated Successfully", "data": u}


@router.get("/location_details")
def get_locations(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    locs = db.query(Locations).filter(Locations.user_id == current_user.id).all()
    if not locs:
        return []
    return [{
        "location_id": x.id, "house_no": x.house_no,
        "city": x.city, "state": x.state, "country": x.country,
        "pincode": x.pincode, "latitude": x.latitude, "longitude": x.longitude,
    } for x in locs]


@router.post("/update_location_details")
def update_location(inp: Update_Address, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    loc = db.query(Locations).filter(Locations.id == inp.id, Locations.user_id == current_user.id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    data = inp.dict(exclude_unset=True)
    data.pop("id", None)
    for k, v in data.items():
        if hasattr(loc, k):
            setattr(loc, k, v)
    db.commit()
    db.refresh(loc)
    return {"message": "Location Updated Successfully", "data": loc}


@router.post("/serviceRequest")
async def service_request(inp: Servie_request, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    rec = ServiceRequest(
        customer_id=current_user.id, service_id=inp.service_id,
        location_id=inp.location_id, description=inp.description, status=inp.status,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    push_job_request({
        "topic_name": "job_request",
        "service_request_id": rec.id,
        "service_id": rec.service_id,
        "service_category": rec.service_category.name,
        "service_location": {
            "house_no": rec.location.house_no,
            "latitude": rec.location.latitude,
            "longitude": rec.location.longitude,
            "city": rec.location.city,
            "pincode": rec.location.pincode,
            "state": rec.location.state,
            "country": rec.location.country,
        },
        "service_description": rec.description,
    })
    return {"status": "Successful", "Service_request_id": rec.id}


@router.get("/history")
async def get_history(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    recs = db.query(ServiceRequest).filter(
        ServiceRequest.customer_id == current_user.id
    ).order_by(ServiceRequest.requested_time.desc()).all()

    out = []
    for rec in recs:
        a = rec.assignment
        w = a.worker if a else None
        p = rec.payment

        otp_val = None
        otp_ttl = None
        if rec.status == Status.ASSIGNED and a:
            try:
                otp_val, otp_ttl = await fetch_otp(rec.id)
            except Exception as e:
                log.warning("otp fetch failed job %s: %s", rec.id, e)

        out.append({
            "job_id": rec.id,
            "service_category": rec.service_category.name if rec.service_category else None,
            "service_id": rec.service_id,
            "location_details": {
                "house_no": rec.location.house_no if rec.location else None,
                "city": rec.location.city if rec.location else None,
                "state": rec.location.state if rec.location else None,
                "pincode": rec.location.pincode if rec.location else None,
                "country": rec.location.country if rec.location else None,
            },
            "requested_time": rec.requested_time,
            "description": rec.description,
            "status": rec.status.value,
            "worker_details": {
                "worker_id": w.id if w else None,
                "worker_name": w.name if w else None,
                "worker_phone": w.phone if w else None,
            },
            "otp": otp_val,
            "otp_ttl_seconds": otp_ttl,
            "amount": p.amount if p else (rec.service_category.base_price if rec.service_category else None),
            "payment_status": p.payment_status.value if p else None,
            "transaction_id": p.transaction_id if p else None,
        })

    return out


@router.get("/booking/{job_id}/otp")
async def get_otp(job_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    job = db.query(ServiceRequest).filter(
        ServiceRequest.id == job_id,
        ServiceRequest.customer_id == current_user.id,
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Booking not found")
    if job.status == Status.PENDING:
        raise HTTPException(status_code=409, detail="Worker hasn't accepted yet")
    if job.status == Status.COMPLETED:
        raise HTTPException(status_code=410, detail="Job already completed")
    if job.status == Status.CANCELLED:
        raise HTTPException(status_code=410, detail="Job was cancelled")

    otp_val, ttl = await fetch_otp(job_id)
    if not otp_val:
        raise HTTPException(status_code=404, detail="OTP expired, contact support")

    w = job.assignment.worker if job.assignment else None
    return {
        "job_id": job_id,
        "otp": otp_val,
        "ttl_seconds": ttl,
        "worker_name": w.name if w else None,
        "worker_phone": w.phone if w else None,
    }


@router.post("/users/CancellJob")
async def cancel_job(inp: Canceljob, current_user=Depends(get_current_user)):
    res = await cancel_job_by_user(inp.job_id)
    return {"message": res}


@router.post("/review")
def submit_review(inp: review, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if db.query(Reviews).filter(Reviews.job_id == inp.job_id).first():
        return "You have already submitted a review"
    try:
        db.add(Reviews(
            job_id=inp.job_id, customer_id=current_user.id,
            worker_id=inp.worker_id, rating=inp.rating, comments=inp.comments,
        ))
        db.commit()
        return "Thank you for your feedback"
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@router.post("/make_payment")
def make_payment(inp: MakePayment, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        job = db.query(ServiceRequest).filter(
            ServiceRequest.id == inp.job_id,
            ServiceRequest.customer_id == current_user.id,
        ).with_for_update().first()

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job.status != Status.COMPLETED:
            raise HTTPException(status_code=400, detail="Work not completed yet")
        if job.payment:
            raise HTTPException(status_code=409, detail="Payment already done")

        fee = inp.amount * 0.1
        p = Payments(
            job_id=job.id, amount=inp.amount, platform_fee=fee,
            provider_amount=inp.amount - fee, payment_status=PaymentStatus.PAID,
            payment_method=inp.payment_method, transaction_id=generate_txn_id(),
        )
        w_id = db.query(JobAssignments.worker_id).filter(JobAssignments.job_id == job.id).scalar()
        db.add(p)
        db.commit()
        db.refresh(p)
        push_job_request({
            "topic_name": "payment_notification",
            "worker_id": w_id,
            "mesage": "Payment_done",
            "type": "Success",
            "transaction_id": p.transaction_id,
        })
        return {"message": "Payment successful", "transaction_id": p.transaction_id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        log.exception("payment failed job %s: %s", inp.job_id, e)
        raise HTTPException(status_code=500, detail="Payment failed")
    finally:
        db.close()


@router.get("/paymentHistory")
def payment_history(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    p = db.query(Payments).join(ServiceRequest, Payments.job_id == ServiceRequest.id).filter(
        ServiceRequest.customer_id == current_user.id
    ).all()
    return p if p else []


@router.post("/AIChat")
def ai_chat(query: str, current_user=Depends(get_current_user)):
    agent = get_agent(current_user.id, current_user.name)
    res = agent.invoke({"messages": [HumanMessage(content=query)]})
    if isinstance(res, dict) and "messages" in res:
        msg = res["messages"][-1]
        if hasattr(msg, "content") and isinstance(msg.content, str):
            return {"response": msg.content}
        elif hasattr(msg, "content") and isinstance(msg.content, list):
            if msg.content and isinstance(msg.content[0], dict) and "text" in msg.content[0]:
                return {"response": msg.content[0]["text"]}
        return {"response": str(msg)}
    elif isinstance(res, dict) and "output" in res:
        return {"response": res["output"]}
    return {"response": "something went wrong"}