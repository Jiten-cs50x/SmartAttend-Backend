import express from "express";

import {
  getTimetable,
  createTimetable,
} from "../controllers/timetableController.js";

const router = express.Router();

router.get("/", getTimetable);
router.post("/", createTimetable);

export default router;
