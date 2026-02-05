from confluent_kafka import Producer
import json

conf = {
    "bootstrap.servers": "localhost:9092",
    "acks": "all",
    "retries": 3
}

producer = Producer(conf)


def delivery_report(err, msg):
    if err:
        print("❌ Delivery failed:", err)
    else:
        print(
            f"✅ Delivered to {msg.topic()} "
            f"[partition {msg.partition()}] "
            f"@ offset {msg.offset()}"
        )

def push_job_request(payload: dict):
    print("from push job request")
    key_options = ["service_request_id", "id", "worker_id", "user_id"]
    message_key = None
    
    for k in key_options:
        if k in payload:
            message_key = str(payload[k])
            break 

    try:
        value = json.dumps(payload).encode("utf-8")
        topic_name=payload.get("topic_name")
        producer.produce(
            topic=topic_name,
            key=message_key,
            value=value,
            callback=delivery_report
        )
        producer.poll(0)
        
    except Exception as e:
       print(f"Failed to produce message: {e}")