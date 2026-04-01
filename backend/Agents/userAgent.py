from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from utilities.database import Users
from langchain_core.tools import StructuredTool
from langchain.agents import create_agent
from sqlalchemy import and_,text
import asyncio
from langchain_core.output_parsers import JsonOutputParser
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()
GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")
from utilities.operations import (
    get_db,
    ServiceRequest,
    ServiceCategories,
    JobAssignments,
    cancel_job_by_user
)

from microservices.producers import push_job_request
from runtime import app_loop

load_dotenv()
groq_api = os.getenv("GROQ_API_KEY")

def fetch_service_id():
    db = next(get_db())
    try:
        records = db.query(ServiceCategories).all()
        return [
            {
                "service_id": r.id,
                "service_name": r.name,
                "description": r.description
            }
            for r in records
        ]
    finally:
        db.close()


def get_location_details(user_id: int):
    db = next(get_db())
    records = db.query(Users).filter(Users.id == user_id).first()
    if not records:
        return "No Record Found"
    return [
        {
            "location_id": loc.id,
            "city": loc.city,
            "state": loc.state
        }
        for loc in records.locations
    ]


def request_service(
    user_id: int,
    service_id: int,
    location_id: int,
    description: str,
    status: str = "PENDING"
):
    db = next(get_db())
    try:
        record = ServiceRequest(
            customer_id=user_id,
            service_id=service_id,
            location_id=location_id,
            description=description,
            status=status
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        push_job_request({
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
        })

        return {
            "service_request_id": record.id,
            "status": "Service request created successfully"
        }

    except Exception as e:
        db.rollback()
        return f"Error occurred: {str(e)}"
    finally:
        db.close()


def cancel_service_request(service_request_id: int):
    try:
        if not app_loop or not app_loop.is_running():
            raise RuntimeError("Event loop is not running")

        future = asyncio.run_coroutine_threadsafe(
            cancel_job_by_user(service_request_id),
            app_loop
        )
        return future.result()

    except Exception as e:
        return f"Cancellation failed: {str(e)}"

def active_jobs(user_id: int):
    db = next(get_db())
    try:
        records = (
            db.query(ServiceRequest)
            .filter(
                ServiceRequest.customer_id == user_id,
                and_(
                    ServiceRequest.status != "CANCELLED",
                    ServiceRequest.status != "COMPLETED"
                )
            )
            .all()
        )

        return [
            {
                "service_request_id": r.id,
                "status": r.status,
                "worker_name": r.assignment.worker.name if r.assignment else None
            }
            for r in records
        ]
    finally:
        db.close()


def job_status(job_id: int):
    db = next(get_db())
    try:
        record = db.query(ServiceRequest).filter(ServiceRequest.id == job_id).first()
        return record.status if record else "No record found"
    finally:
        db.close()


def get_worker_details(job_id: int):
    db = next(get_db())
    try:
        record = db.query(JobAssignments).filter(JobAssignments.job_id == job_id).first()
        if not record:
            return "No record found"

        return {
            "worker_id": record.worker_id,
            "worker_name": record.worker.name,
            "worker_phone_number": record.worker.phone,
            "job_assigned_time": record.assigned_time
        }
    finally:
        db.close()


def SqlQuery(query: str):
    db = next(get_db())
    BLOCKED_KEYWORDS = [
    "insert", "update", "delete", "drop",
    "alter", "truncate", "create", "grant", "revoke"
]
    try:
        normalized = query.strip().lower()

        if not normalized.startswith("select"):
            return "Only SELECT queries are allowed"

        for keyword in BLOCKED_KEYWORDS:
            if keyword in normalized:
                return "Unsafe SQL detected"

        result = db.execute(text(query))
        rows = result.fetchall()

        return [dict(row._mapping) for row in rows]

    except Exception as e:
        return f"Query execution failed: {str(e)}"

    finally:
        db.close()

tools = [
    StructuredTool.from_function(
        name="fetch_service_id",
        func=fetch_service_id,
        description=(
            "Fetch all available service categories. "
            "Use this tool to identify the correct service_id that matches the user's problem description "
            "(e.g., 'AC not cooling' → 'AC Repair')."
        )
    ),
    StructuredTool.from_function(
        name="get_location_details",
        func=get_location_details,
        description=(
            "Fetch all saved locations for the given user_id. "
            "ALWAYS call this before booking a service. "
            "If multiple locations are returned, ask the user to choose one location_id."
        )
    ),
    StructuredTool.from_function(
        name="service_request",
        func=request_service,
        description=(
            "Create a new service request. "
            "Required inputs: user_id, service_id, location_id, description. "
            "Call this ONLY after you have confirmed the correct service_id and location_id."
        )
    ),
    StructuredTool.from_function(
        name="cancel_job",
        func=cancel_service_request,
        description="Cancel an existing service request using service_request_id."
    ),
    StructuredTool.from_function(
        name="active_jobs",
        func=active_jobs,
        description="Retrieve all currently active (not cancelled or completed) jobs for the user."
    ),
    StructuredTool.from_function(
        name="job_status",
        func=job_status,
        description="Check the current status of a specific job using job_id."
    ),
    StructuredTool.from_function(
        name="get_worker_details",
        func=get_worker_details,
        description="Retrieve worker details assigned to a job, including name and contact info."
    ),
    StructuredTool.from_function(
        name="execute_readonly_sql",
        func=SqlQuery,
        description="""
You are allowed to generate READ-ONLY SQL queries (SELECT only) for a PostgreSQL database.
You MUST strictly follow the schema and relationships defined below.
DO NOT generate INSERT, UPDATE, DELETE, DROP, ALTER, or TRUNCATE queries.

--------------------------------------------------
DATABASE: FixEasy (PostgreSQL)
--------------------------------------------------

TABLE: users
- id (integer, primary key, starts at 12500)
- name (string)
- dob (timestamp)
- email (string, unique)
- password (string)
- phone (string)
- created_at (timestamp)

RELATIONS:
- users.id → locations.user_id
- users.id → service_request.customer_id
- users.id → reviews.customer_id

--------------------------------------------------

TABLE: workers
- id (integer, primary key, starts at 1000)
- name (string)
- dob (date)
- phone (string, unique)
- email (string, unique)
- password (string)
- created_at (timestamp)

RELATIONS:
- workers.id → job_assignments.worker_id
- workers.id → workers_status.worker_id
- workers.id → reviews.worker_id
- workers.id ↔ service_categories (many-to-many via worker_service)

--------------------------------------------------

TABLE: workers_status
- id (integer, primary key)
- worker_id (integer, unique, FK → workers.id)
- is_active (enum: online, offline, assigned)
- latitude (float)
- longitude (float)
- worker_capability (integer array of service_category IDs)

--------------------------------------------------

TABLE: service_categories
- id (integer, primary key)
- name (string)
- base_price (float)
- description (text)

RELATIONS:
- service_categories.id → service_request.service_id
- service_categories.id ↔ workers.id (many-to-many via worker_service)

--------------------------------------------------

TABLE: worker_service (association table)
- worker_id (FK → workers.id)
- service_category_id (FK → service_categories.id)

--------------------------------------------------

TABLE: locations
- id (integer, primary key)
- user_id (FK → users.id)
- house_no (text)
- latitude (float)
- longitude (float)
- city (string)
- pincode (integer)
- state (string)
- country (string)

RELATIONS:
- locations.id → service_request.location_id

--------------------------------------------------

TABLE: service_request
- id (integer, primary key)
- customer_id (FK → users.id)
- service_id (FK → service_categories.id)
- location_id (FK → locations.id)
- description (text)
- status (enum: pending, assigned, completed, cancelled)
- requested_time (timestamp)
- completed_time (timestamp, nullable)

RELATIONS:
- service_request.id → job_assignments.job_id
- service_request.id → payments.job_id
- service_request.id → reviews.job_id

--------------------------------------------------

TABLE: job_assignments
- id (integer, primary key)
- job_id (FK → service_request.id)
- worker_id (FK → workers.id)
- assigned_time (timestamp)
- accepted (boolean)

--------------------------------------------------

TABLE: payments
- id (integer, primary key)
- job_id (FK → service_request.id)
- amount (float)
- platform_fee (float)
- provider_amount (float)
- payment_status (enum: pending, paid, failed)
- payment_method (enum: card, cash, upi)
- transaction_id (string)
- created_at (timestamp)

--------------------------------------------------

TABLE: reviews
- id (integer, primary key)
- job_id (FK → service_request.id)
- customer_id (FK → users.id)
- worker_id (FK → workers.id)
- rating (float)
- comments (text)
- created_at (timestamp)

--------------------------------------------------
QUERY RULES (MANDATORY)
--------------------------------------------------
- ONLY generate SELECT queries
- Use proper JOINs based on foreign keys
- Use explicit table names (no ORM names)
- Use WHERE clauses carefully
- Prefer LIMIT when returning lists
- Use aggregates (COUNT, SUM, AVG) when appropriate
- Never guess columns or tables

--------------------------------------------------
EXAMPLES OF VALID QUERIES
--------------------------------------------------
- Pending service requests for a user
- Jobs completed by a worker
- Worker’s daily/monthly earnings
- Cancelled jobs count
- Average rating of a worker
- Payment history for a user
- Services handled by a worker

"""
    )
]


def get_agent(user_id: int, user_name: str):

    system_prompt = f"""
You are an intelligent assistant for the FixEasy service platform.

Your job is to understand the user's intent, use tools ONLY when required,
and ALWAYS respond with a clear, helpful, and human-friendly final answer.

You must follow ALL rules below strictly.
user_name: {user_name} always use user_id for query: {user_id}
--------------------------------------------------
ROLE & CONTEXT
--------------------------------------------------
- You assist users, workers, and admins of the FixEasy platform.
- Users ask about service requests, payments, job status, history, and actions.
- Workers ask about assigned jobs, earnings, payments, and completion status.
- Admins ask about platform-level data and monitoring.

--------------------------------------------------
INTENT UNDERSTANDING
--------------------------------------------------
Before responding, ALWAYS identify the intent:
- Job status (pending / active / completed / cancelled)
- Service requests (create, view, update)
- Payments (history, earnings, transaction info)
- Worker actions (job completion, OTP verification)
- General platform questions

--------------------------------------------------
TOOL USAGE RULES (VERY IMPORTANT)
--------------------------------------------------
- Use tools ONLY when real data is required.
- If a tool is required, call the correct tool with accurate parameters.
- NEVER fabricate data.
- NEVER explain tool mechanics to the user.

--------------------------------------------------
CRITICAL RESPONSE RULE (MOST IMPORTANT)
--------------------------------------------------
AFTER every tool call, you MUST ALWAYS generate
a final user-facing response in plain English.

You are STRICTLY FORBIDDEN from:
- Returning an empty response
- Ending after a tool call
- Returning only raw JSON
- Returning only tool output

If tool output is empty or no data is found:
- Politely explain that no records were found.
- Suggest what the user can do next.

--------------------------------------------------
RESPONSE QUALITY RULES
--------------------------------------------------
- Be clear, polite, and concise.
- Do NOT sound robotic.
- Do NOT repeat system rules.
- Do NOT mention internal tools, databases, or architecture.
- Do NOT guess or hallucinate.

--------------------------------------------------
TONE & STYLE
--------------------------------------------------
- Friendly and professional
- Simple language
- Helpful suggestions when appropriate

--------------------------------------------------
ERROR HANDLING
--------------------------------------------------
If something fails or data is unavailable:
- Explain it calmly and clearly.
- Offer next steps if possible.
- Never expose internal errors or stack traces.

--------------------------------------------------
EXAMPLES (FOR BEHAVIOR ONLY)
--------------------------------------------------
User: "What are my pending service requests?"
→ Use tool to fetch pending requests
→ Final response:
  "You currently have 2


"""
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=GEMINI_API_KEY,
        temperature=0.7,
        model_kwargs={"system_instruction": system_prompt}
    )

    agent = create_agent(
        llm,
        tools=tools,
        system_prompt=system_prompt
    )

    return agent
