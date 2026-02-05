from fastapi import APIRouter,HTTPException,status,Depends
from sqlalchemy.orm import Session
from .usermodels import userSignup,Servie_request,Add_Address,MakePayment,Canceljob,review,Update_Address,Update_user_details,generate_txn_id
from utilities.database import get_db,Users,ServiceRequest,Locations,Payments,Reviews,JobAssignments,Status,PaymentMethod,PaymentStatus
from utilities.Job_Notification import manager
from microservices.producers import push_job_request
from utilities.oauth import get_current_user,hash_password
from Agents.userAgent import get_agent
from langchain_core.messages import HumanMessage
from utilities.operations import cancel_job_by_user
router=APIRouter(prefix="/users")

@router.post("/signup")
def Usersignup(inp: userSignup, db: Session = Depends(get_db)):
    record = db.query(Users).filter(Users.email == inp.email).first()
    if record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email Already Exists"
        )

    new_record = Users(
        name=inp.name,
        dob=inp.dob,
        email=inp.email,
        password=hash_password(inp.password),
        phone=inp.phone
    )
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    return new_record.id

@router.post("/AddAddress")
def Add_Address(inp:Add_Address,db:Session=Depends(get_db),current_user = Depends(get_current_user)):
    record=Locations(
        user_id=current_user.id,
        house_no=inp.house_no,
        latitude=inp.latitude,
        longitude=inp.longitude,
        city=inp.city,
        pincode=inp.pincode,
        state=inp.state,
        country=inp.country
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"Location_id":record.id,"Status":"Success"}

@router.get("/Profile_details")
def get_profile_details(db:Session=Depends(get_db),current_user = Depends(get_current_user)):
    return {
        "name":current_user.name,
        "dob":current_user.dob,
        "email":current_user.email,
        "phone":current_user.phone
    }
@router.post("/update_name")
def Update_name(inp:Update_user_details,db:Session=Depends(get_db),current_user = Depends(get_current_user)):
    record=db.query(Users).filter(Users.id==current_user.id).first()
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
    
@router.get("/location_details")
def get_location_details(db:Session=Depends(get_db),current_user = Depends(get_current_user)):
    records=db.query(Locations).filter(Locations.user_id==current_user.id).all()
    if not records:
        return "No Details Found"
    location_list=[{
        "location_id":x.id,
        "house_no":x.house_no,
        "city":x.city,
        "state":x.state,
        "country":x.country,
        "pincode":x.pincode,
        "latitude":x.latitude,
        "longitude":x.longitude
    }for x in records]
    return location_list

@router.post("/update_location_details")
def update_location_details(inp:Update_Address,db:Session=Depends(get_db),current_user = Depends(get_current_user)):
    record=db.query(Locations).filter(Locations.id==inp.id,Locations.user_id==current_user.id).first()
    if not record:
        return "No record Found"
    update_data=inp.dict(exclude_unset=True)
    update_data.pop("id")
    for key,value in update_data.items():
        if hasattr(record,key):
            setattr(record,key,value)
    db.commit()
    db.refresh(record)
    return {
        "message":"Location Updated Successfully",
        "data":record}

@router.post("/serviceRequest")
async def Servie_Request(service:Servie_request,db:Session=Depends(get_db),current_user = Depends(get_current_user)):

    record=ServiceRequest(
    customer_id=current_user.id,
    service_id=service.service_id,
    location_id=service.location_id,
    description=service.description,
    status=service.status
        )
    db.add(record)
    db.commit()
    db.refresh(record)
    dic={
            "topic_name":"job_request",
            "service_request_id": record.id,
            "service_id": record.service_id,
            "service_category": record.service_category.name,
            "service_location": {
                "house_no": record.location.house_no,
                "latitude": record.location.latitude,
                "longitude": record.location.longitude,
                "city": record.location.city,
                "pincode": record.location.pincode,
                "state": record.location.state,
                "country": record.location.country
            },
            "service_description": record.description
        }
    print("JOB MANAGER ID:", id(manager))
    push_job_request(dic)
    return {"status":"Successfull","Service_request_id":record.id}

@router.get("/history")
def UserHistory(db:Session=Depends(get_db),current_user = Depends(get_current_user)):
    records=db.query(ServiceRequest).filter(ServiceRequest.customer_id==current_user.id).all()
    if not records:
          raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="No Records Found")
    result=[]
    for rec in records:
        assignment = rec.assignment
        worker = assignment.worker if assignment else None

        result.append({
            "service_category": rec.service_category.name if rec.service_category else None,
            "location_details": {
                "house_no": rec.location.house_no if rec.location else None,
                "city": rec.location.city if rec.location else None,
                "state": rec.location.state if rec.location else None,
                "pincode": rec.location.pincode if rec.location else None,
                "country": rec.location.country if rec.location else None
            },
            "requested_time": rec.requested_time,
            "description": rec.description,
            "status": rec.status.value,
            "worker_details": {
                "worker_name": worker.name if worker else None,
                "worker_phone": worker.phone if worker else None
            }
        })

    return result


@router.post("/users/CancellJob")
async def cancel_job(inp:Canceljob,current_user = Depends(get_current_user)):
    result = await cancel_job_by_user(inp.job_id)  
    return {"message": result}

@router.post("/review")
def Review_of_work(inp:review,db:Session=Depends(get_db),current_user = Depends(get_current_user)):
    record=db.query(Reviews).filter(Reviews.job_id==inp.job_id).first()
    if record:
        return "You have Already Submitted the Review"
    try:
      record=Reviews(
        job_id=inp.job_id,
        customer_id=current_user.id,
        worker_id=inp.worker_id,
        rating=inp.rating,
        comments=inp.comments
      )
      db.add(record)
      db.commit()
      return "Thank you For Your Feedback"
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

@router.post("/make_payment")
def make_payment(inp: MakePayment, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        job = (
            db.query(ServiceRequest)
            .filter(
                ServiceRequest.id == inp.job_id,
                ServiceRequest.customer_id == current_user.id
            )
            .with_for_update()
            .first()
        )

        if not job:
            return {"message": "Job not found"}

        if job.status != Status.COMPLETED:
            return {"message": "Work not completed yet"}

        if job.payment:
            return {"message": "Payment already done"}
        platform_fee = inp.amount * 0.1
        provider_amount = inp.amount - platform_fee
        payment = Payments(
            job_id=job.id,
            amount=inp.amount,
            platform_fee=platform_fee,
            provider_amount=provider_amount,
            payment_status=PaymentStatus.PAID,
            payment_method=inp.payment_method,
            transaction_id=generate_txn_id()
        )
        worker_id=db.query(JobAssignments.worker_id).filter(JobAssignments.job_id==job.id).scalar()

        db.add(payment)
        db.commit()
        db.refresh(payment)
        payload={
            "topic_name":"payment_notification",
            "worker_id":worker_id,
            "mesage":"Payment_done",
            "type":"Success",
            "transaction_id":payment.transaction_id
        }
        push_job_request(payload)
        return {
            "message": "Payment successful",
            "transaction_id": payment.transaction_id
        }
    
    except Exception as e:
        db.rollback()
        return {"message": "Payment failed"}

    finally:
        db.close()





@router.get("/paymentHistory")
def get_payment_history(db:Session=Depends(get_db),current_user = Depends(get_current_user)):
    payments=(db.query(Payments)
    .join(ServiceRequest,Payments.job_id==ServiceRequest.id)
    .filter(ServiceRequest.customer_id==current_user.id)
    .all())
    if not payments:
        return "No payment History found"
    return payments

@router.post("/AIChat")
def AIChat(query:str,current_user = Depends(get_current_user)):
    agent=get_agent(current_user.id,current_user.name)
    result = agent.invoke(
        {"messages": [HumanMessage(content=query)]},
    )
    if isinstance(result, dict) and 'messages' in result:
    
        final_message = result['messages'][-1]
        if hasattr(final_message, 'content') and isinstance(final_message.content, str):
            return {"response": final_message.content}
        elif hasattr(final_message, 'content') and isinstance(final_message.content, list):
         
            if final_message.content and isinstance(final_message.content[0], dict) and 'text' in final_message.content[0]:
                return {"response": final_message.content[0]['text']}
        else:
            return {"response": str(final_message)}

    elif isinstance(result, dict) and "output" in result:
        return {"response": result["output"]}
        
    return {"response": f"An unknown error occurred. Raw output structure mismatch."}
