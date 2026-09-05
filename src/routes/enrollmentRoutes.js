import express from "express";

import {
  getEnrollments,
  createEnrollment,
} from "../controllers/enrollmentController.js";

const router = express.Router();

router.get("/", getEnrollments);
router.post("/", createEnrollment);

export default router;
