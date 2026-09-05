import express from "express";

import {
  getFacultyDashboard,
  getFacultyTimetable,
} from "../controllers/facultyController.js";

import {
  getFacultyNotifications,
  markNotificationAsRead,
  markAllFacultyNotificationsAsRead,
} from "../controllers/notificationController.js";

import { getFacultyAttendanceHistory } from "../controllers/attendanceController.js";

import { getFacultyClasses } from "../controllers/classController.js";

import { authenticate } from "../middleware/authMiddleware.js";

import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get(
  "/dashboard",
  authenticate,
  authorize("FACULTY"),
  getFacultyDashboard,
);

router.get(
  "/timetable",
  authenticate,
  authorize("FACULTY"),
  getFacultyTimetable,
);

router.get("/classes", authenticate, authorize("FACULTY"), getFacultyClasses);

router.get(
  "/attendance/history",
  authenticate,
  authorize("FACULTY"),
  getFacultyAttendanceHistory,
);

router.get(
  "/notifications",
  authenticate,
  authorize("FACULTY"),
  getFacultyNotifications,
);

router.put(
  "/notifications/read-all",
  authenticate,
  authorize("FACULTY"),
  markAllFacultyNotificationsAsRead,
);

router.put(
  "/notifications/:id/read",
  authenticate,
  authorize("FACULTY"),
  markNotificationAsRead,
);
export default router;
