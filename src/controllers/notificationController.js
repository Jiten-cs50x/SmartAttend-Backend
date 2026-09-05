import { db } from "../prisma/db.js";

export const getFacultyNotifications = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const notifications = await db.orm.public.Notification.all();

    const facultyNotifications = notifications
      .filter((notification) => notification.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    res.status(200).json({
      success: true,
      data: facultyNotifications,
    });
  } catch (error) {
    console.error("Error fetching faculty notifications:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const notificationId = Number(req.params.id);

    const notifications = await db.orm.public.Notification.all();

    const notification = notifications.find(
      (item) => item.id === notificationId,
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Make sure the faculty can only modify their own notification
    if (notification.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to modify this notification",
      });
    }

    const updatedNotification = await db.orm.public.Notification.where({
      id: notificationId,
    }).update({
      isRead: true,
    });

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: updatedNotification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};

export const markAllFacultyNotificationsAsRead = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const notifications = await db.orm.public.Notification.all();

    const facultyNotifications = notifications.filter(
      (notification) => notification.userId === userId,
    );

    for (const notification of facultyNotifications) {
      if (!notification.isRead) {
        await db.orm.public.Notification.where({ id: notification.id }).update({
          isRead: true,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
    });
  }
};
