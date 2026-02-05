from sqlalchemy import (
    Float, Boolean, Column, String, Integer,
    func, DateTime, Text, Enum as sqlenum,
    ForeignKey, create_engine, Table, Date, Sequence
)
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy.dialects.postgresql import ARRAY
from enum import Enum

Base = declarative_base()

DATABASE_URL = "postgresql://postgres:password1234@localhost/fixeasy"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Role(Enum):
    CUSTOMER = "customer"
    PROVIDER = "provider"
    ADMIN = "admin"


class Status(Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PaymentStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"


class PaymentMethod(Enum):
    CARD = "card"
    CASH = "cash"
    UPI = "upi"


class ActiveStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    ASSIGNED = "assigned"


class Users(Base):
    __tablename__ = "users"

    id = Column(Integer, Sequence("users_id_seq", start=12500), primary_key=True)
    name = Column(String, nullable=False)
    dob = Column(DateTime, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    locations = relationship("Locations", back_populates="user", cascade="all, delete")
    service_requests = relationship("ServiceRequest", back_populates="customer")
   

class Workers(Base):
    __tablename__ = "workers"

    id = Column(Integer, Sequence("workers_id_seq", start=1000), primary_key=True)
    name = Column(String, nullable=False)
    dob = Column(Date, nullable=False)
    phone = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
   
    status = relationship("WorkerStatus", uselist=False, back_populates="worker", cascade="all, delete")
    service_categories = relationship(
        "ServiceCategories",
        secondary="worker_service",
        back_populates="workers"
    )


class WorkerStatus(Base):
    __tablename__ = "workers_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, unique=True)
    is_active = Column(sqlenum(ActiveStatus), default=ActiveStatus.OFFLINE)
    latitude = Column(Float)
    longitude = Column(Float)
    worker_capability = Column(ARRAY(Integer), nullable=False)

    worker = relationship("Workers", back_populates="status")


worker_service = Table(
    "worker_service",
    Base.metadata,
    Column("worker_id", Integer, ForeignKey("workers.id"), primary_key=True),
    Column("service_category_id", Integer, ForeignKey("service_categories.id"), primary_key=True)
)


class ServiceCategories(Base):
    __tablename__ = "service_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    base_price = Column(Float, default=100.0)
    description = Column(Text, nullable=False)

    workers = relationship(
        "Workers",
        secondary=worker_service,
        back_populates="service_categories"
    )

    service_requests = relationship(
        "ServiceRequest",
        back_populates="service_category"
    )


class ServiceRequest(Base):
    __tablename__ = "service_request"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("service_categories.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(sqlenum(Status), default=Status.PENDING)
    requested_time = Column(DateTime(timezone=True), server_default=func.now())
    completed_time = Column(DateTime(timezone=True), nullable=True)

    customer = relationship("Users", back_populates="service_requests")
    location = relationship("Locations", back_populates="service_requests")
    service_category = relationship("ServiceCategories", back_populates="service_requests")
    assignment = relationship("JobAssignments", uselist=False, back_populates="job", cascade="all, delete")
    payment = relationship("Payments", uselist=False, back_populates="job", cascade="all, delete")
    review = relationship("Reviews", uselist=False, back_populates="job", cascade="all, delete")


class JobAssignments(Base):
    __tablename__ = "job_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("service_request.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    assigned_time = Column(DateTime(timezone=True), server_default=func.now())
    accepted = Column(Boolean, default=False)

    job = relationship("ServiceRequest", back_populates="assignment")
    worker = relationship("Workers")


class Payments(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("service_request.id"), nullable=False)
    amount = Column(Float, nullable=False)
    platform_fee = Column(Float, nullable=False)
    provider_amount = Column(Float, nullable=False)
    payment_status = Column(sqlenum(PaymentStatus), nullable=False)
    payment_method = Column(sqlenum(PaymentMethod), nullable=False)
    transaction_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("ServiceRequest", back_populates="payment")
    
class Reviews(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("service_request.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False)
    rating = Column(Float, nullable=False)
    comments = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("ServiceRequest", back_populates="review")


class Locations(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    house_no = Column(Text, nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    city = Column(String, nullable=False)
    pincode = Column(Integer, nullable=False)
    state = Column(String, nullable=False)
    country = Column(String, nullable=False)

    user = relationship("Users", back_populates="locations")
    service_requests = relationship("ServiceRequest", back_populates="location")


class Admins(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
