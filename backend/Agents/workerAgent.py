from langchain_groq import ChatGroq
from dotenv import load_dotenv
from utilities.database import get_db,ServiceRequest,ServiceCategories,JobAssignments
from langchain_core.tools import StructuredTool
from utilities.operations import cancel_job_by_user
from main import app_loop
from sqlalchemy import and_
import asyncio
from microservices.producers import push_job_request
load_dotenv()
import os
groq_api=os.getenv("GROQ_API_KEY")

llm=ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0.5,
    groq_api_key=groq_api
)

