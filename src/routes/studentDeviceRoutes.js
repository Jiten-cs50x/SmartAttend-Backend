import express from "express";
import { registerStudentDevice } from "../controllers/studentDeviceController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post(
  "/device",
  authenticate,
  authorize("STUDENT"),
  registerStudentDevice,
);

export default router;
