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

