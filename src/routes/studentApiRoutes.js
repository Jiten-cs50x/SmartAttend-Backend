import express from "express";

import {
  getStudentDashboard,
  getStudentProfile,
  getStudentSubjects,
  getStudentSubjectDetails,
  getStudentTimetable,
  getStudentAttendance,
  getStudentAttendanceHistory,
} from "../controllers/studentController.js";

import { authenticate } from "../middleware/authMiddleware.js";

import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get(
  "/dashboard",
  authenticate,
  authorize("STUDENT"),
  getStudentDashboard,
);

router.get("/profile", authenticate, authorize("STUDENT"), getStudentProfile);

router.get("/subjects", authenticate, authorize("STUDENT"), getStudentSubjects);

router.get(
  "/subjects/:id",
  authenticate,
  authorize("STUDENT"),
  getStudentSubjectDetails,
);

router.get(
  "/timetable",
  authenticate,
  authorize("STUDENT"),
  getStudentTimetable,
);

router.get(
  "/attendance",
  authenticate,
  authorize("STUDENT"),
  getStudentAttendance,
);

router.get(
  "/attendance/history",
  authenticate,
  authorize("STUDENT"),
  getStudentAttendanceHistory,
);

export default router;
