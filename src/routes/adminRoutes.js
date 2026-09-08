import express from "express";

import {
  getAdminDashboard,
  getAdminStudents,
  createAdminStudent,
} from "../controllers/adminController.js";

import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/dashboard", authenticate, authorize("ADMIN"), getAdminDashboard);

router.get("/students", authenticate, authorize("ADMIN"), getAdminStudents);

router.post("/students", authenticate, authorize("ADMIN"), createAdminStudent);

export default router;
