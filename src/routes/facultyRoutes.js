import express from "express";

import { authenticate } from "../middleware/authMiddleware.js";

import { getFaculty, createFaculty } from "../controllers/facultyController.js";

const router = express.Router();

router.get("/", authenticate, getFaculty);
router.post("/", authenticate, createFaculty);

export default router;
