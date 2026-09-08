import express from "express";

import {
  getAttendance,
  markAttendance,
  updateAttendance,
  createAttendanceSession,
  getAttendanceSession,
  getSessionParticipants,
  finalizeAttendanceSession,
  verifyBleAttendance,
  verifyStudentBleAttendance,
  getStudentActiveSession,
} from "../controllers/attendanceController.js";

import { authenticate } from "../middleware/authMiddleware.js";

import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Existing attendance APIs
router.get("/", getAttendance);

router.post("/", authenticate, authorize("FACULTY"), markAttendance);

router.post(
  "/ble/verify",
  authenticate,
  authorize("FACULTY"),
  verifyBleAttendance,
);

router.post(
  "/student/ble/verify",
  authenticate,
  authorize("STUDENT"),
  verifyStudentBleAttendance,
);

router.put("/:id", authenticate, authorize("FACULTY"), updateAttendance);

// Attendance Session APIs
router.post(
  "/sessions",
  authenticate,
  authorize("FACULTY"),
  createAttendanceSession,
);

router.get(
  "/sessions/:id",
  authenticate,
  authorize("FACULTY"),
  getAttendanceSession,
);

router.get(
  "/sessions/:id/participants",
  authenticate,
  authorize("FACULTY"),
  getSessionParticipants,
);

router.post(
  "/sessions/:id/finalize",
  authenticate,
  authorize("FACULTY"),
  finalizeAttendanceSession,
);

router.get(
  "/student/active-session/:classId",
  authenticate,
  authorize("STUDENT"),
  getStudentActiveSession,
);

export default router;
