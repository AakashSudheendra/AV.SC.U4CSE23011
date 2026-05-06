


# Stage 5 — Scalable Notification Dispatch

## Current Implementation

```python
function notify_all(student_ids: array, message: string):

    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

---

## Problems with This Approach

When sending notifications to 50,000 students, the current implementation hits a number of serious limitations:

- **Sequential processing** — each student is handled one at a time, making the entire operation very slow
- **Tight coupling** — email sending, database writes, and push notifications all happen in the same loop, meaning one failure can block the others
- **No fault tolerance** — if an email fails halfway through, some students get the notification and some don't, leaving the system in an inconsistent state
- **High response time** — the calling process waits for all 50,000 operations to complete before returning
- **No retry mechanism** — failed deliveries are silently lost

---

## What Happens When Email Fails for 200 Students?

Without any retry or queue mechanism:

- Some students receive the email, others don't
- The database may already contain records for students whose emails were never delivered
- There's no reliable way to identify and retry the failed batch
- The system has no way to guarantee consistent delivery

---

## Improved Design: Queue-Based Async Architecture

The key insight is that **storing the notification** and **delivering it** are two separate concerns and should be decoupled.

### Suggested Flow

1. Immediately save all notification records to the database
2. Push each delivery job into a message queue
3. Background workers pick up jobs from the queue and handle email and push delivery
4. If a job fails, it is automatically retried without affecting other jobs

Technologies that work well here: **RabbitMQ**, **Kafka**, or **BullMQ** (for Node.js-based systems).

---

## Should DB Save and Email Sending Happen Together?

No — they should always be separated.

The database write is critical and must always succeed. Email delivery is an external operation that can fail for reasons outside our control (rate limits, API downtime, network issues). Keeping them separate means:

- Notification records are always stored, even if email delivery fails
- Email failures don't cause database inconsistencies
- Retry logic is isolated to the delivery layer

---

## Revised Pseudocode

```python
function notify_all(student_ids: array, message: string):

    for student_id in student_ids:
        save_to_db(student_id, message)
        add_to_queue({
            student_id,
            message
        })


worker_process():

    while queue_not_empty():
        job = get_next_job()

        try:
            send_email(job.student_id, job.message)
            push_to_app(job.student_id, job.message)

        except:
            retry_job(job)
```

---

## Advantages of This Design

| Improvement | Description |
|---|---|
| **Speed** | Database writes and queue pushes are fast; delivery happens asynchronously |
| **Scalability** | Multiple workers can process the queue in parallel |
| **Reliability** | Failed jobs are retried automatically without affecting others |
| **Decoupling** | Storage and delivery are independent — a failed email doesn't corrupt the database |
| **Lower API response time** | The API returns immediately after queuing, instead of waiting for all emails to send |