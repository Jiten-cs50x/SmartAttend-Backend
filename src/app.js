import express from "express";
import cors from "cors";
import departmentRoutes from "./routes/departmentRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import facultyRoutes from "./routes/facultyRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import timetableRoutes from "./routes/timetableRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import studentApiRoutes from "./routes/studentApiRoutes.js";
import facultyApiRoutes from "./routes/facultyApiRoutes.js";
import studentDeviceRoutes from "./routes/studentDeviceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "SmartAttend Backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "SmartAttend API is healthy",
  });
});

app.use("/api/departments", departmentRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentApiRoutes);
app.use("/api/student", studentDeviceRoutes);
app.use("/api/faculty", facultyApiRoutes);

export default app;
