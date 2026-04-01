from pydantic import BaseModel,EmailStr
from datetime import date
from enum import Enum
from typing import List
from utilities.database import ActiveStatus

class workerSignup(BaseModel):
    name:str
    phone:str
    dob:date
    email:EmailStr
    password:str

class workerLogin(BaseModel):
    email:EmailStr
    password:str

class UpdateWorkerStatus(BaseModel):
    is_active:ActiveStatus=ActiveStatus.ONLINE
    latitude:float
    longitude:float
class addWorkercapability(BaseModel):
    worker_capability:List[int]

class Update_worker_details(BaseModel):
      name:str |None=None
      dob:date | None=None
      phone:str |None=None


class Canceljob(BaseModel):
    job_id:int
    worker_id:int


class Workcompleted(BaseModel):
    otp:str
    job_id:int