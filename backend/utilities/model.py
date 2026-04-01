from pydantic import BaseModel,EmailStr
from datetime import date

class Address(BaseModel):
    HouseNO:str
    city:str
    pincode:int
    latitude:int
    longitude:int
    state:str
    country:str
class JobRequest(BaseModel):
    user_id:int
    category:str
    issue:str
    address:Address
    
class Add_Services_categories(BaseModel):
    category:str
    description:str

class workerRegister(BaseModel):
    name:str
    dob:date
    phone:str
    email:EmailStr
    password:str

class login_schema(BaseModel):
    email:EmailStr
    password:str




