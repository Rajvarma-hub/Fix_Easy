from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from utilities.database import get_db, Users, Workers, Admins
load_dotenv()

SECRET_KEY = os.getenv("secret_key")
ALGORITHM = os.getenv("algorithm")

if not SECRET_KEY or not ALGORITHM:
    raise RuntimeError("JWT configuration missing")

app = FastAPI()
oauthrouter = APIRouter(prefix="/oauth")

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth_user = OAuth2PasswordBearer(tokenUrl="/oauth/user/token",scheme_name="UserOAuth")
oauth_worker = OAuth2PasswordBearer(tokenUrl="/oauth/worker/token",scheme_name="WorkerOAuth")
oauth_admin = OAuth2PasswordBearer(tokenUrl="/oauth/admin/token",scheme_name="AdminOAuth")


MODEL_REGISTRY = {
    "user": Users,
    "worker": Workers,
    "admin": Admins
}

def hash_password(password: str) -> str:
    return pwd.hash(password)

def verify_pass(plain: str, hashed: str) -> bool:
    return pwd.verify(plain, hashed)

def create_access_token(id: int, role: str, expire_minutes: int = 30):
    payload = {
        "sub": str(id),
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(minutes=expire_minutes)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def authenticate(role: str, form: OAuth2PasswordRequestForm, db: Session):
    model = MODEL_REGISTRY.get(role)
    if not model:
        raise HTTPException(status_code=400, detail="Invalid role")

    record = db.query(model).filter(model.email == form.username).first()
    if not record or not verify_pass(form.password, record.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return record

@oauthrouter.post("/user/token")
def user_login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate("user", form, db)
    token = create_access_token(user.id, "user")
    return {"access_token": token, "token_type": "bearer","user_id":user.id}

@oauthrouter.post("/worker/token")
def worker_login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    worker = authenticate("worker", form, db)
    token = create_access_token(worker.id, "worker")
    return {"access_token": token, "token_type": "bearer","worker_id":worker.id}

@oauthrouter.post("/admin/token")
def admin_login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    admin = authenticate("admin", form, db)
    token = create_access_token(admin.id, "admin")
    return {"access_token": token, "token_type": "bearer","admin_id":admin.id}

def get_current_user(
    token: str = Depends(oauth_user),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id or not role:
            raise HTTPException(status_code=401, detail="Unauthorized")
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")

    model = MODEL_REGISTRY.get(role)
    if not model:
        raise HTTPException(status_code=401, detail="Invalid role")

    record = db.query(model).filter(model.id == int(user_id)).first()
    if not record:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return record


def get_current_worker(
    token: str = Depends(oauth_worker),
    db: Session = Depends(get_db)
):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Worker access required")

    worker = db.query(Workers).filter(Workers.id == int(payload["sub"])).first()
    if not worker:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return worker

def get_current_admin(
    token: str = Depends(oauth_admin),
    db: Session = Depends(get_db)
):
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    admin = db.query(Admins).filter(Admins.id == int(payload["sub"])).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return admin
