import { db } from "../prisma/db.js";

// ---------------------------------------------------------
// GET ALL ATTENDANCE
// ---------------------------------------------------------

export const getAttendance = async (req, res) => {
  try {
    const attendance = await db.orm.public.Attendance.all();

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
    });
  }
};

// ---------------------------------------------------------
// CREATE ATTENDANCE SESSION
// ---------------------------------------------------------

export const createAttendanceSession = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { classId, sessionDate } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Class ID is required",
      });
    }

    // Find faculty linked to logged-in user
    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Find class
    const classes = await db.orm.public.Class.all();

    const selectedClass = classes.find(
      (item) => item.id === Number(classId) && item.facultyId === faculty.id,
    );

    if (!selectedClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found or not assigned to this faculty",
      });
    }

    // Create session
    const session = await db.orm.public.AttendanceSession.create({
      classId: Number(classId),
      sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      startedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Attendance session created successfully",
      data: session,
    });
  } catch (error) {
    console.error("Error creating attendance session:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create attendance session",
    });
  }
};

// ---------------------------------------------------------
// GET ATTENDANCE SESSION
// ---------------------------------------------------------

export const getAttendanceSession = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const sessionId = Number(req.params.id);

    if (!Number.isInteger(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    // Find faculty
    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Find session
    const sessions = await db.orm.public.AttendanceSession.all();

    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Attendance session not found",
      });
    }

    // Verify faculty owns the class
    const classes = await db.orm.public.Class.all();

    const classItem = classes.find(
      (item) => item.id === session.classId && item.facultyId === faculty.id,
    );

    if (!classItem) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this attendance session",
      });
    }

    res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("Error fetching attendance session:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance session",
    });
  }
};

// ---------------------------------------------------------
// GET SESSION PARTICIPANTS
// ---------------------------------------------------------

export const getSessionParticipants = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const sessionId = Number(req.params.id);

    if (!Number.isInteger(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    // Find faculty
    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Find session
    const sessions = await db.orm.public.AttendanceSession.all();

    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Attendance session not found",
      });
    }

    // Verify faculty owns the class
    const classes = await db.orm.public.Class.all();

    const classItem = classes.find(
      (item) => item.id === session.classId && item.facultyId === faculty.id,
    );

    if (!classItem) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this attendance session",
      });
    }

    // Get enrolled students
    const enrollments = await db.orm.public.Enrollment.all();

    const classEnrollments = enrollments.filter(
      (item) => item.classId === classItem.id,
    );

    const students = await db.orm.public.Student.all();
    const users = await db.orm.public.User.all();

    // Get existing attendance records for this session
    const attendanceRecords = await db.orm.public.Attendance.all();

    const sessionAttendance = attendanceRecords.filter(
      (item) => item.sessionId === sessionId,
    );

    const participants = classEnrollments.map((enrollment) => {
      const student = students.find((item) => item.id === enrollment.studentId);

      const user = users.find((item) => item.id === student?.userId);

      const attendance = sessionAttendance.find(
        (item) => item.studentId === student?.id,
      );

      return {
        studentId: student?.id ?? null,
        registerNumber: student?.registerNumber ?? null,
        name: user?.name ?? null,
        email: user?.email ?? null,
        status: attendance?.status ?? "ABSENT",
        source: attendance?.source ?? null,
        attendanceId: attendance?.id ?? null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        classId: classItem.id,
        participants,
        totalStudents: participants.length,
      },
    });
  } catch (error) {
    console.error("Error fetching session participants:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch session participants",
    });
  }
};

// ---------------------------------------------------------
// MARK ATTENDANCE
// ---------------------------------------------------------

export const markAttendance = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const { sessionId, studentId, status, source } = req.body;

    if (!sessionId || !studentId || !status || !source) {
      return res.status(400).json({
        success: false,
        message: "Session ID, student ID, status and source are required",
      });
    }

    const validStatuses = ["PRESENT", "ABSENT", "LATE"];

    const validSources = ["BLE", "MANUAL"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status",
      });
    }

    if (!validSources.includes(source)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance source",
      });
    }

    // Find faculty
    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Find session
    const sessions = await db.orm.public.AttendanceSession.all();

    const session = sessions.find((item) => item.id === Number(sessionId));

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Attendance session not found",
      });
    }

    // Verify faculty owns the class
    const classes = await db.orm.public.Class.all();

    const selectedClass = classes.find(
      (item) => item.id === session.classId && item.facultyId === faculty.id,
    );

    if (!selectedClass) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this attendance session",
      });
    }

    // Check student
    const students = await db.orm.public.Student.all();

    const student = students.find((item) => item.id === Number(studentId));

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check enrollment
    const enrollments = await db.orm.public.Enrollment.all();

    const enrolled = enrollments.some(
      (item) =>
        item.studentId === Number(studentId) &&
        item.classId === session.classId,
    );

    if (!enrolled) {
      return res.status(400).json({
        success: false,
        message: "Student is not enrolled in this class",
      });
    }

    // Check existing attendance
    const attendanceRecords = await db.orm.public.Attendance.all();

    const existingAttendance = attendanceRecords.find(
      (item) =>
        item.sessionId === Number(sessionId) &&
        item.studentId === Number(studentId),
    );

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked for this student",
        data: existingAttendance,
      });
    }

    // Create attendance
    const attendance = await db.orm.public.Attendance.create({
      sessionId: Number(sessionId),
      studentId: Number(studentId),
      status,
      source,
      modifiedBy: faculty.userId,
    });

    res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: attendance,
    });
  } catch (error) {
    console.error("Error marking attendance:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark attendance",
    });
  }
};

// ---------------------------------------------------------
// UPDATE ATTENDANCE
// ---------------------------------------------------------

export const updateAttendance = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const attendanceId = Number(req.params.id);

    const { status, reason } = req.body;

    console.log("UPDATE ATTENDANCE REQUEST:", {
      attendanceId,
      status,
      reason,
    });

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["PRESENT", "ABSENT", "LATE"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance status",
      });
    }

    // Find faculty
    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Find attendance
    const attendanceRecords = await db.orm.public.Attendance.all();

    const attendance = attendanceRecords.find(
      (item) => item.id === attendanceId,
    );

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    // Find session
    const sessions = await db.orm.public.AttendanceSession.all();

    const session = sessions.find((item) => item.id === attendance.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Attendance session not found",
      });
    }

    if (session.endedAt) {
      return res.status(400).json({
        success: false,
        message: "Attendance session is already finalized",
      });
    }

    // Verify faculty owns the class
    const classes = await db.orm.public.Class.all();

    const classItem = classes.find(
      (item) => item.id === session.classId && item.facultyId === faculty.id,
    );

    if (!classItem) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this attendance record",
      });
    }

    if (attendance.status === status) {
      return res.status(400).json({
        success: false,
        message: "New status is same as current status",
      });
    }

    const updatedAttendance = await db.orm.public.Attendance.where({
      id: attendanceId,
    }).update({
      status,
      source: "MANUAL",
      modifiedBy: faculty.userId,
    });

    const log = await db.orm.public.AttendanceLog.create({
      attendanceId,
      oldStatus: attendance.status,
      newStatus: status,
      changedBy: faculty.userId,
      reason: reason || null,
    });

    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: {
        attendance: updatedAttendance,
        log,
      },
    });
    // } catch (error) {
    //   console.error("Error updating attendance:", error);

    //   res.status(500).json({
    //     success: false,
    //     message: "Failed to update attendance",
    //   });
    // }
  } catch (error) {
    console.error("Error updating attendance:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update attendance",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// FINALIZE ATTENDANCE SESSION
// ---------------------------------------------------------

export const finalizeAttendanceSession = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const sessionId = Number(req.params.id);

    // Find faculty
    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Find session
    const sessions = await db.orm.public.AttendanceSession.all();

    const session = sessions.find((item) => item.id === sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Attendance session not found",
      });
    }

    // Verify faculty owns class
    const classes = await db.orm.public.Class.all();

    const classItem = classes.find(
      (item) => item.id === session.classId && item.facultyId === faculty.id,
    );

    if (!classItem) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this attendance session",
      });
    }

    if (session.endedAt) {
      return res.status(400).json({
        success: false,
        message: "Attendance session is already finalized",
      });
    }

    // Mark session as completed
    const updatedSession = await db.orm.public.AttendanceSession.where({
      id: sessionId,
    }).update({
      endedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: "Attendance session finalized successfully",
      data: updatedSession,
    });
  } catch (error) {
    console.error("Error finalizing attendance session:", error);

    res.status(500).json({
      success: false,
      message: "Failed to finalize attendance session",
    });
  }
};

export const getFacultyAttendanceHistory = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    // Find logged-in faculty
    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Get classes handled by this faculty
    const classes = await db.orm.public.Class.all();

    const facultyClasses = classes.filter(
      (item) => item.facultyId === faculty.id,
    );

    const classIds = facultyClasses.map((item) => item.id);

    // Get attendance sessions for those classes
    const sessions = await db.orm.public.AttendanceSession.all();

    const facultySessions = sessions.filter((session) =>
      classIds.includes(session.classId),
    );

    // Supporting data
    const subjects = await db.orm.public.Subject.all();
    const attendanceRecords = await db.orm.public.Attendance.all();
    const enrollments = await db.orm.public.Enrollment.all();

    const history = facultySessions.map((session) => {
      const classInfo = facultyClasses.find(
        (item) => item.id === session.classId,
      );

      const subject = subjects.find((item) => item.id === classInfo?.subjectId);

      const classEnrollments = enrollments.filter(
        (item) => item.classId === session.classId,
      );

      const sessionAttendance = attendanceRecords.filter(
        (item) => item.sessionId === session.id,
      );

      const presentCount = sessionAttendance.filter(
        (item) => item.status === "PRESENT",
      ).length;

      const absentCount = sessionAttendance.filter(
        (item) => item.status === "ABSENT",
      ).length;

      const lateCount = sessionAttendance.filter(
        (item) => item.status === "LATE",
      ).length;

      return {
        sessionId: session.id,
        sessionDate: session.sessionDate,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        status: session.endedAt ? "FINALIZED" : "OPEN",

        class: {
          id: classInfo?.id ?? null,
          semester: classInfo?.semester ?? null,
          section: classInfo?.section ?? null,
          academicYear: classInfo?.academicYear ?? null,
        },

        subject: subject
          ? {
              id: subject.id,
              code: subject.code,
              name: subject.name,
            }
          : null,

        attendance: {
          totalStudents: classEnrollments.length,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
        },
      };
    });

    // Newest sessions first
    history.sort(
      (a, b) =>
        new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime(),
    );

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching faculty attendance history:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty attendance history",
    });
  }
};
