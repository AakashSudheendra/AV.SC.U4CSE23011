const notifications = [
    {
        id: "1",
        type: "Placement",
        message: "Amazon shortlisted your profile",
        timestamp: "2026-05-06T10:30:00Z",
        isRead: false
    },
    {
        id: "2",
        type: "Result",
        message: "Semester results published",
        timestamp: "2026-05-06T08:00:00Z",
        isRead: false
    },
    {
        id: "3",
        type: "Event",
        message: "Hackathon registrations open",
        timestamp: "2026-05-05T18:00:00Z",
        isRead: false
    },
    {
        id: "4",
        type: "Placement",
        message: "Microsoft hiring drive announced",
        timestamp: "2026-05-06T11:15:00Z",
        isRead: true
    },
    {
        id: "5",
        type: "Placement",
        message: "Adobe online assessment scheduled",
        timestamp: "2026-05-06T09:45:00Z",
        isRead: false
    }
];

const priorityWeights = {
    Placement: 3,
    Result: 2,
    Event: 1
};

function calculatePriority(notification) {

    const typeWeight =
        priorityWeights[notification.type] || 0;

    const unreadBonus =
        notification.isRead ? 0 : 5;

    const recencyScore =
        new Date(notification.timestamp).getTime();

    return (
        typeWeight * 100 +
        unreadBonus +
        recencyScore / 1000000000000
    );
}

function getTopNotifications(data, limit = 10) {

    return data
        .map(notification => ({
            ...notification,
            score: calculatePriority(notification)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

const topNotifications =
    getTopNotifications(notifications);

console.log("\nTop Priority Notifications\n");

console.table(topNotifications);