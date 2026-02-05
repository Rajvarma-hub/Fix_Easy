import asyncio
import threading
import signal
import sys
from microservices.consumer import start_consumer, stop_event

# Create an event loop for the consumer
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

def signal_handler(sig, frame):
    print("Shutting down consumer...")
    stop_event.set()
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("Starting detached Kafka Consumer...")
    # Pass the loop so async database/redis calls work
    start_consumer(stop_event, loop)
