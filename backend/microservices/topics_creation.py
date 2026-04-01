from confluent_kafka.admin import AdminClient,NewTopic

conf={'bootstrap.servers':'localhost:19092,localhost:19094'}
admin_client=AdminClient(conf)

new_topic=NewTopic(
    "test-topic",
    num_partitions=3,
    replication_factor=2
)

fs=admin_client.create_topics([new_topic])

for topic,f in fs.items():
    try:
        f.result()
        print(f"Topic {topic} created successfully")
    except Exception as e:
        print(f"Failed to create topic {topic}: {e}")
