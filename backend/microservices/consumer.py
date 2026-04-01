from confluent_kafka import Consumer
import json
import threading
import asyncio

from utilities.operations import Jobnotification,notify_woker_payment

stop_event = threading.Event()

def start_consumer(stop_event: threading.Event, app_loop: asyncio.AbstractEventLoop):
    consumer = Consumer({
        "bootstrap.servers": "kafka:9092",
        "group.id": "fixeasy-job-consumer",
        "auto.offset.reset": "earliest",
        "enable.auto.commit": False
    })

    consumer.subscribe(["job_request","payment_notification"])
    print("Kafka consumer started")

    try:
        while not stop_event.is_set():
            msg = consumer.poll(1.0)

            if msg is None:
                continue

            if msg.error():
                continue
            print("Received topic:", msg.topic())


            payload = json.loads(msg.value().decode("utf-8"))
            if msg.topic()=="job_request":
              Jobnotification(payload, app_loop)
            else:
                notify_woker_payment(payload,app_loop)


            consumer.commit(message=msg)

    except Exception as e:
        print("Kafka consumer error:", e)

    finally:
        print("Closing Kafka consumer")
        consumer.close()
