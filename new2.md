
# Stage 3 — Query Analysis & Optimisation

## Query Under Review

```sql
SELECT * FROM notifications
WHERE studentID = 1042
AND isRead = false
ORDER BY createdAt DESC;
```

This query is logically correct — it retrieves unread notifications for a specific student and returns them in reverse chronological order, which is exactly what the frontend needs.

However, on a table with millions of rows, this query can become noticeably slow.

---

## Why It Slows Down

- Without indexes, the database performs a **full table scan** to find matching rows
- Sorting a large result set by `createdAt` is computationally expensive
- Returning all matching rows without a limit can cause memory pressure
- The problem gets worse as more students and notifications are added over time

---

## Optimisation: Compound Index

A compound index across the three most relevant columns makes a significant difference:

```sql
CREATE INDEX idx_notifications
ON notifications(studentID, isRead, createdAt DESC);
```

This works well because:

- **studentID** filtering narrows the dataset immediately
- **isRead** filtering further reduces the result set to only unread entries
- **createdAt DESC** sorting is handled by the index itself, avoiding a separate sort operation

---

## Computational Cost Comparison

| Scenario | Behaviour |
|---|---|
| Without indexing | Full table scan — approaches O(n) as rows increase |
| With compound index | Index traversal — significantly fewer rows examined, sorting pre-optimised |

---

## Should Every Column Be Indexed?

No. Over-indexing is a common mistake and introduces its own problems:

- Every index consumes additional storage
- Insert and update operations become slower because indexes must be maintained
- Too many indexes add unnecessary maintenance overhead

Indexes should only be added for columns that are:
- Frequently used in `WHERE` filters
- Used for sorting (`ORDER BY`)
- Used in `JOIN` conditions

---

## Additional Query — Students with Recent Placement Notifications

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL 7 DAY;
```

This query identifies all students who received a placement-related notification in the last 7 days — useful for analytics, reporting, or triggering follow-up actions.

---

# Stage 4 — Performance Optimisation

## The Problem

When notifications are fetched on every page load for every student, the database receives a large volume of repeated read requests. As the user base scales, this puts increasing pressure on the database and degrades overall performance.

A combination of strategies can be applied to reduce this load and improve response times.

---

## 1. Pagination

Rather than loading all notifications at once, fetch them in small, manageable batches.

```http
GET /api/v1/notifications?page=1&limit=20
```

**Benefits:**
- Smaller response payloads
- Reduced database load per request
- Faster API responses for the user

**Trade-off:**
- The frontend needs to implement pagination controls or infinite scroll

---

## 2. Caching with Redis

Store recently fetched notifications in Redis so that repeat requests are served from cache instead of hitting the database.

**Benefits:**
- Near-instant response times for cached data
- Dramatically reduces repeated database queries
- Improves scalability as user count grows

**Trade-off:**
- Cache invalidation must be handled carefully — stale data can cause inconsistencies
- Requires additional infrastructure (Redis server) and memory allocation

---

## 3. WebSockets for Real-Time Updates

Instead of repeatedly polling the API for new notifications, the server pushes updates directly to connected clients using WebSockets.

**Benefits:**
- Eliminates unnecessary API calls between updates
- Users receive notifications the moment they are created
- Reduces overall database read traffic

**Trade-off:**
- Connection management is more complex than simple REST polling
- Persistent socket connections must be maintained per connected user

---

## 4. Database Indexing

Adding indexes on commonly queried fields such as `userId`, `isRead`, and `createdAt` ensures queries run efficiently even as the table grows.

**Benefits:**
- Faster search and sort operations

**Trade-off:**
- Slightly slower write operations (inserts/updates must update indexes)
- Increases storage usage

---

## 5. Archiving Old Notifications

Notifications beyond a certain age (e.g., 90 days) can be moved to a separate archive collection or table.

**Benefits:**
- Keeps the active collection small and fast
- Improves performance for the most recent, frequently accessed data

**Trade-off:**
- Archived data retrieval requires querying a secondary store, which may be slower

---

## Recommended Approach

The most effective strategy combines multiple techniques together:

- **Pagination** to control response size
- **Redis caching** to reduce database load for frequent reads
- **WebSockets** to eliminate polling and deliver updates in real time
- **Proper indexing** to keep database queries fast at scale

No single solution solves everything — using them in combination gives the best overall performance and reliability.

---

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