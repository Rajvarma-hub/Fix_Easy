import logging
from mcp.server.fastmcp import FastMCP
from agents.fixeasy_agent import  fetch_service_id, get_location_details, request_service, cancel_service_request, active_jobs, job_status, get_worker_details, SqlQuery
logging.basicConfig(level=logging.INFO)

mcp = FastMCP("FixEasy MCP Server")
@mcp.tool()
def fetch_services():
    return fetch_service_id()

@mcp.tool()
def get_locations(user_id: int):
    return get_location_details(user_id)

@mcp.tool()
def create_job( user_id: int,service_id: int,location_id: int,description: str):
  return request_service(
        user_id=user_id,
        service_id=service_id,
        location_id=location_id,
        description=description,
    )


@mcp.tool()
def cancel_job(service_request_id: int):
    return cancel_service_request(service_request_id)


@mcp.tool()
def list_active_jobs(user_id: int):
    return active_jobs(user_id)


@mcp.tool()
def check_job_status(job_id: int):
    return job_status(job_id)

@mcp.tool()
def get_assigned_worker(job_id: int):
    return get_worker_details(job_id)


@mcp.tool()
def execute_safe_sql(query: str):
    return SqlQuery(query)


if __name__ == "__main__":
    mcp.run(transport="stdio")
