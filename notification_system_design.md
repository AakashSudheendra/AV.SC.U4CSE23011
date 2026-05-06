# Stage 1

## Notification System API Design

A notification service is required for students to receive updates related to placements, events, and results after logging into the platform.

The system should support:

- viewing notifications
- viewing a single notification
- creating notifications
- marking notifications as read
- deleting notifications
- receiving real-time updates

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

# APIs

## 1. Get All Notifications

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

```json
{
  "success": false,
  "message": "Notification not found"
}
```

---

# Real-Time Notifications

For real-time notification delivery, WebSockets can be used so users receive updates instantly without refreshing the application.

### WebSocket Endpoint

```txt
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

## Notes

- REST naming conventions are followed
- JWT token can be used for authentication
- API versioning is included
- JSON response format is kept consistent
- WebSockets are used for real-time updates

---

# Stage 2

## Database Choice

MongoDB can be used for storing notifications because notification data is flexible and generated frequently in large volumes.

Advantages of MongoDB:

- schema flexibility
- faster development
- suitable for high-volume notification systems
- easy to scale horizontally
- stores JSON-like documents

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

## Indexing

Indexes can improve query performance.

```javascript
db.notifications.createIndex({ userId: 1 });

db.notifications.createIndex({ createdAt: -1 });
```

---

## Example Queries

### 1. Get All Notifications

```javascript
db.notifications
  .find({
    userId: "user_1001",
  })
  .sort({
    createdAt: -1,
  });
```

---

### 2. Get Notification By ID

```javascript
db.notifications.findOne({
  _id: "notif_101",
});
```

---

### 3. Create Notification

```javascript
db.notifications.insertOne({
  _id: "notif_101",
  userId: "user_1001",
  title: "Placement Update",
  message: "Amazon shortlisted your profile",
  type: "placement",
  isRead: false,
  createdAt: new Date(),
});
```

---

### 4. Mark Notification as Read

```javascript
db.notifications.updateOne(
  { _id: "notif_101" },
  {
    $set: {
      isRead: true,
    },
  },
);
```

---

### 5. Delete Notification

```javascript
db.notifications.deleteOne({
  _id: "notif_101",
});
```

---

## Problems as Data Increases

As notification data increases, some issues may occur:

- slower query performance
- larger collection size
- increased read traffic
- delay in fetching recent notifications

---

## Solutions

### 1. Indexing

Indexes can improve filtering and sorting speed.

### 2. Pagination

Notifications can be loaded page by page.

Example:

```http
GET /api/v1/notifications?page=1&limit=20
```

### 3. Archiving Old Notifications

Older notifications can be moved to archive collections.

### 4. Caching

Frequently accessed notifications can be cached using Redis.

### 5. Sharding

MongoDB sharding can distribute data across multiple servers for scalability.

---



# Stage 3

## Query Analysis

```sql
SELECT * FROM notifications
WHERE studentID = 1042
AND isRead = false
ORDER BY createdAt DESC;
```

The query is correct because it fetches unread notifications for a particular student and sorts them by latest notifications first.

However, the query may become slow when the table contains millions of records.

---

## Reasons for Slow Performance

Possible reasons:

- full table scan may happen
- sorting large amounts of data is expensive
- missing indexes on frequently searched fields
- returning too many rows at once

When the database grows to millions of notifications, query execution time increases significantly without proper indexing.

---

## Improvements

A compound index can improve performance.

```sql
CREATE INDEX idx_notifications
ON notifications(studentID, isRead, createdAt DESC);
```

This helps because:

- studentID filtering becomes faster
- unread notifications are filtered quickly
- sorting by createdAt becomes optimized

---

## Computational Cost

Without indexing:

- time complexity can become approximately O(n)

With proper indexing:

- query performance improves significantly
- database searches fewer rows
- sorting cost is reduced

---

## Should We Add Indexes on Every Column?

No, adding indexes on every column is not a good practice.

Problems with too many indexes:

- increased storage usage
- slower insert and update operations
- unnecessary maintenance overhead

Indexes should only be created for:

- frequently searched columns
- filtering fields
- sorting fields
- JOIN conditions

---

## Query to Find Students Who Received Placement Notifications in Last 7 Days

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
AND createdAt >= NOW() - INTERVAL 7 DAY;
```

This query:

- filters placement notifications
- checks notifications from last 7 days
- returns unique student IDs


---

# Stage 4

When notifications are fetched on every page load for every student, the database receives a very large number of repeated requests. As the number of users increases, this can overload the DB and reduce performance.

To improve performance and reduce database load, multiple optimizations can be used.

---

## 1. Pagination

Instead of loading all notifications at once, notifications can be fetched in smaller batches.

Example:

```http
GET /api/v1/notifications?page=1&limit=20
```

### Advantages
- reduces response size
- reduces DB load
- faster API responses

### Tradeoff
- frontend needs pagination handling

---

## 2. Caching

Frequently accessed notifications can be cached using Redis.

Instead of querying the database repeatedly, recent notifications can be served directly from cache.

### Advantages
- very fast response time
- reduces repeated DB queries
- improves scalability

### Tradeoff
- cache invalidation must be handled properly
- extra memory usage

---

## 3. Real-Time Notifications

Instead of fetching notifications repeatedly using API polling, WebSockets can be used for real-time updates.

The server pushes new notifications directly to connected users.

### Advantages
- reduces unnecessary API calls
- real-time user experience
- lower database traffic

### Tradeoff
- more complex connection management
- persistent socket connections required

---

## 4. Database Indexing

Indexes on commonly filtered fields such as userId, isRead, and createdAt can improve query speed.

### Advantages
- faster searching and sorting

### Tradeoff
- slightly slower insert/update operations
- additional storage required

---

## 5. Archiving Old Notifications

Old notifications can be moved to archive collections or tables.

### Advantages
- reduces active database size
- improves performance for recent data

### Tradeoff
- archived data retrieval becomes slower

---

## Recommended Approach

A combination of:
- pagination
- Redis caching
- WebSockets
- proper indexing

would provide better scalability and improved user experience for the notification platform.


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