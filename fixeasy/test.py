from utilities.database import get_db,ServiceRequest,JobAssignments
db=next(get_db())
job_id=31
current_user_id=1002
record = (
            db.query(ServiceRequest)
            .join(JobAssignments, JobAssignments.job_id == ServiceRequest.id)
            .filter(
                ServiceRequest.id == job_id,
                JobAssignments.worker_id == current_user_id
            )
            .with_for_update()
            .first()
        )

print(record.status)