# Notification System Design

---

# Stage 1 — API Design

## Overview

The goal here is to build a notification service that keeps students informed about placement updates, upcoming events, and results — all accessible right after they log into the platform.

The system needs to handle the following core operations:

- Viewing all notifications
- Viewing a single notification in detail
- Creating new notifications
- Marking a notification as read
- Deleting a notification
- Delivering real-time updates without requiring a page refresh

---

## Base URL

```http
/api/v1
```

---

## Common Headers

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer <token>
```

### Response Headers

```http
Content-Type: application/json
```

---

## Notification Object

Each notification follows this structure:

```json
{
  "id": "notif_101",
  "userId": "user_1001",
  "title": "Placement Update",
  "message": "Amazon shortlisted your profile",
  "type": "placement",
  "isRead": false,
  "createdAt": "2026-05-06T10:30:00Z"
}
```

---

# API Endpoints

## 1. Get All Notifications

Fetches the full list of notifications for the authenticated user.

### Endpoint

```http
GET /api/v1/notifications
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "notif_101",
      "title": "Placement Update",
      "message": "Amazon shortlisted your profile",
      "isRead": false
    },
    {
      "id": "notif_102",
      "title": "Exam Result",
      "message": "Your semester results are published",
      "isRead": true
    }
  ]
}
```

---

## 2. Get Notification By ID

Retrieves a specific notification using its unique ID.

### Endpoint

```http
GET /api/v1/notifications/:id
```

### Example

```http
GET /api/v1/notifications/notif_101
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "notif_101",
    "title": "Placement Update",
    "message": "Amazon shortlisted your profile",
    "type": "placement",
    "isRead": false
  }
}
```

---

## 3. Create Notification

Creates a new notification for a specific user.

### Endpoint

```http
POST /api/v1/notifications
```

### Request Body

```json
{
  "userId": "user_1001",
  "title": "Placement Update",
  "message": "Amazon shortlisted your profile",
  "type": "placement"
}
```

### Response

```json
{
  "success": true,
  "message": "Notification created successfully"
}
```

---

## 4. Mark Notification as Read

Updates the read status of a notification once the user has viewed it.

### Endpoint

```http
PATCH /api/v1/notifications/:id/read
```

### Response

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## 5. Delete Notification

Removes a notification permanently.

### Endpoint

```http
DELETE /api/v1/notifications/:id
```

### Response

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## Error Response

When something goes wrong (e.g., a notification doesn't exist):

```json
{
  "success": false,
  "message": "Notification not found"
}
```

---

# Real-Time Notifications

For instant delivery, the system uses WebSockets. This means users receive new notifications the moment they arrive — no polling, no manual refresh.

### WebSocket Endpoint

```
ws://localhost:3000/notifications
```

### Event Payload

```json
{
  "event": "NEW_NOTIFICATION",
  "data": {
    "id": "notif_201",
    "title": "New Event",
    "message": "Hackathon registrations are open"
  }
}
```

---

## Design Notes

- REST naming conventions are followed throughout
- JWT tokens are used for authentication and authorization
- API versioning (`/v1`) is included to support future changes
- All responses use a consistent JSON format
- WebSockets handle real-time notification delivery

---




# Stage 2 — Database Design

## Why MongoDB?

MongoDB is a natural fit for a notification system. Notification data tends to be flexible in structure, generated in high volumes, and doesn't always require strict relational constraints — all areas where MongoDB excels.

Key reasons for choosing MongoDB:

- **Schema flexibility** — notifications can carry different fields depending on type (placement, event, result) without requiring schema migrations
- **Faster development** — document-based storage maps directly to how notification data is structured in the application
- **High-volume support** — designed to handle large amounts of write-heavy data efficiently
- **Horizontal scalability** — scales out easily as user count and data volume grow
- **JSON-like documents** — data can be stored and retrieved without complex transformations

---

## Notification Collection Structure

```json
{
  "_id": "notif_101",
  "userId": "user_1001",
  "title": "Placement Update",
  "message": "Amazon shortlisted your profile",
  "type": "placement",
  "isRead": false,
  "createdAt": "2026-05-06T10:30:00Z"
}
```

---

## Indexing Strategy

To keep queries fast as the collection grows, the following indexes are created:

```javascript
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ createdAt: -1 });
```

These ensure that fetching notifications for a specific user and sorting by time remain efficient operations.

---

## Example Queries

### 1. Get All Notifications for a User

```javascript
db.notifications
  .find({ userId: "user_1001" })
  .sort({ createdAt: -1 });
```

### 2. Get a Single Notification

```javascript
db.notifications.findOne({ _id: "notif_101" });
```

### 3. Create a Notification

```javascript
db.notifications.insertOne({
  _id: "notif_101",
  userId: "user_1001",
  title: "Placement Update",
  message: "Amazon shortlisted your profile",
  type: "placement",
  isRead: false,
  createdAt: new Date()
});
```

### 4. Mark as Read

```javascript
db.notifications.updateOne(
  { _id: "notif_101" },
  { $set: { isRead: true } }
);
```

### 5. Delete a Notification

```javascript
db.notifications.deleteOne({ _id: "notif_101" });
```

---

## Scaling Challenges

As the notification collection grows into millions of records, a few challenges can arise:

- Query performance degrades without proper indexing
- Collection size increases storage requirements
- Read traffic spikes during peak usage (e.g., after results are published)
- Fetching recent notifications becomes slower without sorted indexes

---

## Solutions

### 1. Indexing
Compound indexes on frequently filtered fields speed up both filtering and sorting operations.

### 2. Pagination
Loading notifications in pages keeps response sizes manageable:

```http
GET /api/v1/notifications?page=1&limit=20
```

### 3. Archiving Old Notifications
Notifications older than a certain threshold can be moved to a separate archive collection, keeping the active collection lean and fast.

### 4. Caching with Redis
Frequently accessed notifications (e.g., the most recent 20 for a user) can be cached in Redis, reducing repeated database hits significantly.

### 5. Sharding
For very large deployments, MongoDB's built-in sharding can distribute data across multiple servers, allowing the system to scale horizontally.

---





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

# Stage 5

## Problems in Current Implementation

```python
function notify_all(student_ids: array, message: string):

    for student_id in student_ids:

        send_email(student_id, message)

        save_to_db(student_id, message)

        push_to_app(student_id, message)
```

The current implementation has multiple issues when sending notifications to 50,000 students.

### Shortcomings

- operations are executed sequentially
- sending emails one by one is slow
- if email sending fails midway, processing becomes inconsistent
- database operations and email operations are tightly coupled
- a single failure can interrupt the entire process
- high response time for large batches

---

## What Happens if Email Fails for 200 Students?

If email sending fails midway:
- some students receive notifications
- some students do not receive emails
- database may already contain partial records
- system becomes inconsistent

Retry handling becomes difficult in this approach.

---

## Better Design

A queue-based asynchronous architecture can improve scalability and reliability.

### Suggested Flow

1. save notifications to database
2. push jobs into a message queue
3. background workers process emails separately
4. failed jobs can be retried safely

Technologies such as RabbitMQ, Kafka, or BullMQ can be used.

---

## Should DB Save and Email Sending Happen Together?

No, both operations should be separated.

Reason:
- database storage is critical
- email sending is an external service
- email APIs can fail or become slow
- notification records should still be stored even if email delivery fails

This improves reliability and fault tolerance.

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

- faster processing
- scalable for large users
- failure handling becomes easier
- retries are supported
- reduced API response time
- improved reliability