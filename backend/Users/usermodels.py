from pydantic import BaseModel,EmailStr
from datetime import date
from utilities.database import Status,PaymentStatus,PaymentMethod

class userSignup(BaseModel):
    name:str
    dob:date
    email:EmailStr
    password:str
    phone:str

class Add_Address(BaseModel):
    house_no:str
    latitude:float
    longitude:float
    city:str
    pincode:int
    state:str
    country:str
class Update_Address(BaseModel):
    id:int
    house_no:str |None=None
    latitude:float |None=None
    longitude:float |None=None
    city:str |None=None
    pincode:int |None=None
    state:str |None=None
    country:str |None=None

class Update_user_details(BaseModel):
      name:str |None=None
      dob:date | None=None
      phone:str |None=None

class Servie_request(BaseModel):
    service_id:int
    location_id:int
    description:str
    status:Status=Status.PENDING

class MakePayment(BaseModel):
    job_id:int
    amount:float
    payment_status:PaymentStatus=PaymentStatus.PENDING
    payment_method:PaymentMethod


class Canceljob(BaseModel):
    job_id:int

class review(BaseModel):
    job_id:int
    worker_id:int
    rating:int
    comments:str

import random

def generate_txn_id():
    return str(random.randint(10**11, 10**12 - 1))
