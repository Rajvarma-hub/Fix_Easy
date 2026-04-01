from pydantic import BaseModel,EmailStr
from datetime import date

class AdminSignup(BaseModel):
    name:str
    email:EmailStr
    password:str

class AdminLogin(BaseModel):
    email:EmailStr
    password:str

class service_categories(BaseModel):
    name:str
    base_price:float
    description:str

class Services_price(BaseModel):
    category_id:int
    name:str
    base_price:float
    estimated_time:int

class DeleteUser(BaseModel):
    id:int

class FetchworkerDetails(BaseModel):
    id:int