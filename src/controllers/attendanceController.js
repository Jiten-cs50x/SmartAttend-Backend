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
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: "Class ID is required",
      });
    }

    // --------------------------------------------------
    // 1. Find logged-in faculty
    // --------------------------------------------------

    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // --------------------------------------------------
    // 2. Find the class
    // --------------------------------------------------

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

    // --------------------------------------------------
    // 3. Find today's timetable
    // --------------------------------------------------

    const timetables = await db.orm.public.Timetable.all();

    const now = new Date();

    // JavaScript:
    // Sunday = 0
    // Monday = 1
    // Tuesday = 2
    // ...
    // Saturday = 6

    const todayDay = now.getDay();

    const todayTimetable = timetables.find(
      (item) => item.classId === Number(classId) && item.dayOfWeek === todayDay,
    );

    if (!todayTimetable) {
      return res.status(400).json({
        success: false,
        message: "This class is not scheduled for today",
      });
    }

    // --------------------------------------------------
    // 4. Convert timetable start/end into today's dates
    // --------------------------------------------------

    const [startHour, startMinute] = todayTimetable.startTime
      .split(":")
      .map(Number);

    const [endHour, endMinute] = todayTimetable.endTime.split(":").map(Number);

    const scheduleStart = new Date(now);

    scheduleStart.setHours(startHour, startMinute, 0, 0);

    const scheduleEnd = new Date(now);

    scheduleEnd.setHours(endHour, endMinute, 0, 0);

    // --------------------------------------------------
    // 5. Too early
    // --------------------------------------------------

    if (now < scheduleStart) {
      return res.status(400).json({
        success: false,
        message: `Attendance can only be started at ${todayTimetable.startTime}`,
      });
    }

    // --------------------------------------------------
    // 6. Too late
    // --------------------------------------------------

    if (now >= scheduleEnd) {
      return res.status(400).json({
        success: false,
        message: `Attendance session for this class ended at ${todayTimetable.endTime}`,
      });
    }

    // --------------------------------------------------
    // 7. Check whether a session already exists
    // --------------------------------------------------

    const sessions = await db.orm.public.AttendanceSession.all();

    const activeSession = sessions.find(
      (session) =>
        session.classId === Number(classId) &&
        !session.endedAt &&
        session.startedAt &&
        new Date(session.startedAt) >= scheduleStart &&
        new Date(session.startedAt) < scheduleEnd,
    );

    if (activeSession) {
      return res.status(409).json({
        success: false,
        message: "An attendance session is already active for this class",
        data: activeSession,
      });
    }

    // --------------------------------------------------
    // 8. Create attendance session
    // --------------------------------------------------

    const session = await db.orm.public.AttendanceSession.create({
      classId: Number(classId),
      sessionDate: now,
      startedAt: now,
    });

    // --------------------------------------------------
    // 9. Return session + schedule information
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Attendance session created successfully",

      data: {
        ...session,

        timetableId: todayTimetable.id,

        scheduledStart: scheduleStart,

        scheduledEnd: scheduleEnd,
      },
    });
  } catch (error) {
    console.error("Error creating attendance session:", error);

    return res.status(500).json({
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

    // Prevent finalizing an already finalized session
    if (session.endedAt) {
      return res.status(400).json({
        success: false,
        message: "Attendance session is already finalized",
      });
    }

    // Get all students enrolled in this class
    const enrollments = await db.orm.public.Enrollment.all();

    const classEnrollments = enrollments.filter(
      (enrollment) => enrollment.classId === session.classId,
    );

    // Get existing attendance records
    const attendanceList = await db.orm.public.Attendance.all();

    // Create ABSENT attendance for students who were not marked
    for (const enrollment of classEnrollments) {
      const existingAttendance = attendanceList.find(
        (attendance) =>
          attendance.sessionId === sessionId &&
          attendance.studentId === enrollment.studentId,
      );

      if (!existingAttendance) {
        await db.orm.public.Attendance.create({
          sessionId: sessionId,
          studentId: enrollment.studentId,
          status: "ABSENT",
          source: "MANUAL",
          modifiedBy: userId,
        });
      }
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

// ---------------------------------------------------------
// BLE ATTENDANCE VERIFICATION
// ---------------------------------------------------------

export const verifyBleAttendance = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { sessionId, cryptographicKey } = req.body;

    // Validate request
    if (!sessionId || !cryptographicKey) {
      return res.status(400).json({
        success: false,
        message: "Session ID and cryptographic key are required",
      });
    }

    const parsedSessionId = Number(sessionId);

    if (!Number.isInteger(parsedSessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    // -------------------------------------------------------
    // 1. Find logged-in faculty
    // -------------------------------------------------------

    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // -------------------------------------------------------
    // 2. Find attendance session
    // -------------------------------------------------------

    const sessions = await db.orm.public.AttendanceSession.all();

    const session = sessions.find((item) => item.id === parsedSessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Attendance session not found",
      });
    }

    // -------------------------------------------------------
    // 3. Check session is still open
    // -------------------------------------------------------

    if (session.endedAt) {
      return res.status(400).json({
        success: false,
        message: "Attendance session is already finalized",
      });
    }

    // -------------------------------------------------------
    // 4. Verify faculty owns this session's class
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // 5. Find student device using cryptographic key
    // -------------------------------------------------------

    const devices = await db.orm.public.StudentDevice.all();

    const device = devices.find(
      (item) => item.publicKey === cryptographicKey && item.isActive === true,
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Student device is not registered or is inactive",
      });
    }

    // -------------------------------------------------------
    // 6. Identify student
    // -------------------------------------------------------

    const students = await db.orm.public.Student.all();

    const student = students.find((item) => item.id === device.studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student associated with this device was not found",
      });
    }

    // -------------------------------------------------------
    // 7. Check student enrollment
    // -------------------------------------------------------

    const enrollments = await db.orm.public.Enrollment.all();

    const enrolled = enrollments.some(
      (item) =>
        item.studentId === student.id && item.classId === session.classId,
    );

    if (!enrolled) {
      return res.status(400).json({
        success: false,
        message: "Student is not enrolled in this class",
      });
    }

    // -------------------------------------------------------
    // 8. Check existing attendance
    // -------------------------------------------------------

    const attendanceRecords = await db.orm.public.Attendance.all();

    const existingAttendance = attendanceRecords.find(
      (item) =>
        item.sessionId === parsedSessionId && item.studentId === student.id,
    );

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked for this student",
        data: {
          studentId: student.id,
          registerNumber: student.registerNumber,
          status: existingAttendance.status,
          source: existingAttendance.source,
          attendanceId: existingAttendance.id,
        },
      });
    }

    // -------------------------------------------------------
    // 9. Mark attendance as PRESENT using BLE
    // -------------------------------------------------------

    const attendance = await db.orm.public.Attendance.create({
      sessionId: parsedSessionId,
      studentId: student.id,
      status: "PRESENT",
      source: "BLE",
      modifiedBy: faculty.userId,
    });

    // -------------------------------------------------------
    // 10. Return result to BLE/Android side
    // -------------------------------------------------------

    res.status(201).json({
      success: true,
      message: "BLE attendance marked successfully",
      data: {
        attendanceId: attendance.id,
        sessionId: parsedSessionId,
        studentId: student.id,
        registerNumber: student.registerNumber,
        status: attendance.status,
        source: attendance.source,
      },
    });
  } catch (error) {
    console.error("BLE attendance verification error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to verify BLE attendance",
    });
  }
};

// ---------------------------------------------------------
// STUDENT BLE ATTENDANCE VERIFICATION
// ---------------------------------------------------------

export const verifyStudentBleAttendance = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { sessionId, rssi } = req.body;

    // 1. Validate request
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    const parsedSessionId = Number(sessionId);

    if (!Number.isInteger(parsedSessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID",
      });
    }

    // 2. Find logged-in student
    const students = await db.orm.public.Student.all();

    const student = students.find((item) => item.userId === userId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // 3. Find attendance session
    const sessions = await db.orm.public.AttendanceSession.all();

    const session = sessions.find((item) => item.id === parsedSessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Attendance session not found",
      });
    }

    // 4. Session must still be open
    if (session.endedAt) {
      return res.status(400).json({
        success: false,
        message: "Attendance session is already finalized",
      });
    }

    // 5. Check student enrollment
    const enrollments = await db.orm.public.Enrollment.all();

    const enrolled = enrollments.some(
      (item) =>
        item.studentId === student.id && item.classId === session.classId,
    );

    if (!enrolled) {
      return res.status(403).json({
        success: false,
        message: "Student is not enrolled in this class",
      });
    }

    // 6. Check registered active device
    const devices = await db.orm.public.StudentDevice.all();

    const device = devices.find(
      (item) => item.studentId === student.id && item.isActive === true,
    );

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "No active registered device found",
      });
    }

    // 7. Prevent duplicate attendance
    const attendanceRecords = await db.orm.public.Attendance.all();

    const existingAttendance = attendanceRecords.find(
      (item) =>
        item.sessionId === parsedSessionId && item.studentId === student.id,
    );

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: "Attendance already marked for this student",
        data: {
          attendanceId: existingAttendance.id,
          sessionId: parsedSessionId,
          studentId: student.id,
          registerNumber: student.registerNumber,
          status: existingAttendance.status,
          source: existingAttendance.source,
        },
      });
    }

    // 8. Mark PRESENT
    const attendance = await db.orm.public.Attendance.create({
      sessionId: parsedSessionId,
      studentId: student.id,
      status: "PRESENT",
      source: "BLE",
      modifiedBy: userId,
    });

    console.log("STUDENT BLE ATTENDANCE MARKED:", {
      sessionId: parsedSessionId,
      studentId: student.id,
      rssi,
      attendanceId: attendance.id,
    });

    // 9. Return success
    return res.status(201).json({
      success: true,
      message: "Attendance marked successfully",
      data: {
        attendanceId: attendance.id,
        sessionId: parsedSessionId,
        studentId: student.id,
        registerNumber: student.registerNumber,
        status: attendance.status,
        source: attendance.source,
        rssi: rssi ?? null,
      },
    });
  } catch (error) {
    console.error("Student BLE attendance verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to verify student BLE attendance",
    });
  }
};
export const getStudentActiveSession = async (req, res) => {
  try {
    const classId = Number(req.params.classId);

    if (!Number.isInteger(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID",
      });
    }

    const now = new Date();

    // --------------------------------------------------
    // 1. Find today's timetable
    // --------------------------------------------------

    const timetables = await db.orm.public.Timetable.all();

    const todayDay = now.getDay();

    const timetable = timetables.find(
      (item) => item.classId === classId && item.dayOfWeek === todayDay,
    );

    if (!timetable) {
      return res.status(200).json({
        success: true,
        data: {
          active: false,
        },
      });
    }

    // --------------------------------------------------
    // 2. Convert timetable time to today's Date
    // --------------------------------------------------

    const [startHour, startMinute] = timetable.startTime.split(":").map(Number);

    const [endHour, endMinute] = timetable.endTime.split(":").map(Number);

    const scheduleStart = new Date(now);

    scheduleStart.setHours(startHour, startMinute, 0, 0);

    const scheduleEnd = new Date(now);

    scheduleEnd.setHours(endHour, endMinute, 0, 0);

    // --------------------------------------------------
    // 3. Outside class time = inactive
    // --------------------------------------------------

    if (now < scheduleStart || now >= scheduleEnd) {
      return res.status(200).json({
        success: true,
        data: {
          active: false,
        },
      });
    }

    // --------------------------------------------------
    // 4. Find active attendance session
    // --------------------------------------------------

    const sessions = await db.orm.public.AttendanceSession.all();

    const activeSession = sessions.find(
      (session) =>
        session.classId === classId &&
        session.startedAt &&
        !session.endedAt &&
        new Date(session.startedAt) >= scheduleStart &&
        new Date(session.startedAt) < scheduleEnd,
    );

    // --------------------------------------------------
    // 5. Faculty hasn't started
    // --------------------------------------------------

    if (!activeSession) {
      return res.status(200).json({
        success: true,
        data: {
          active: false,
        },
      });
    }

    // --------------------------------------------------
    // 6. Active session found
    // --------------------------------------------------

    return res.status(200).json({
      success: true,

      data: {
        active: true,

        sessionId: activeSession.id,

        startedAt: activeSession.startedAt,

        scheduledStart: scheduleStart,

        scheduledEnd: scheduleEnd,
      },
    });
  } catch (error) {
    console.error("Student active session error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check active attendance session",
    });
  }
};
