import express from "express";

import { authenticate } from "../middleware/authMiddleware.js";

import {
  getStudents,
  createStudent,
} from "../controllers/studentController.js";

const router = express.Router();

router.get("/", authenticate, getStudents);
router.post("/", authenticate, createStudent);

export default router;
