import { db } from "../prisma/db.js";
import bcrypt from "bcryptjs";

export const getFaculty = async (req, res) => {
  try {
    const faculty = await db.orm.public.Faculty.all();

    res.status(200).json({
      success: true,
      data: faculty,
    });
  } catch (error) {
    console.error("Error fetching faculty:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty",
    });
  }
};

export const createFaculty = async (req, res) => {
  try {
    const { name, email, password, employeeId, departmentId } = req.body;

    if (!name || !email || !password || !employeeId || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check email
    const users = await db.orm.public.User.all();

    if (users.some((user) => user.email === email)) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Check employee ID
    const existingFaculty = await db.orm.public.Faculty.all();

    if (existingFaculty.some((faculty) => faculty.employeeId === employeeId)) {
      return res.status(409).json({
        success: false,
        message: "Employee ID already exists",
      });
    }

    // Check department
    const departments = await db.orm.public.Department.all();

    const department = departments.find(
      (dept) => dept.id === Number(departmentId),
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create User
    const user = await db.orm.public.User.create({
      name,
      email,
      passwordHash,
      role: "FACULTY",
      isActive: true,
    });

    // Create Faculty
    const faculty = await db.orm.public.Faculty.create({
      userId: user.id,
      employeeId,
      departmentId: Number(departmentId),
    });

    res.status(201).json({
      success: true,
      message: "Faculty created successfully",
      data: {
        user,
        faculty,
      },
    });
  } catch (error) {
    console.error("Error creating faculty:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create faculty",
    });
  }
};

export const getFacultyDashboard = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    // Find faculty profile linked to the logged-in user
    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Get user details
    const users = await db.orm.public.User.all();

    const user = users.find((item) => item.id === userId);

    // Get department
    const departments = await db.orm.public.Department.all();

    const department = departments.find(
      (item) => item.id === faculty.departmentId,
    );

    // Get classes handled by this faculty
    const classes = await db.orm.public.Class.all();

    const facultyClasses = classes.filter(
      (item) => item.facultyId === faculty.id,
    );

    res.status(200).json({
      success: true,
      data: {
        id: faculty.id,
        employeeId: faculty.employeeId,
        name: user?.name ?? null,
        email: user?.email ?? null,
        department: department?.name ?? null,
        departmentCode: department?.code ?? null,
        totalClasses: facultyClasses.length,
      },
    });
  } catch (error) {
    console.error("Error fetching faculty dashboard:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty dashboard",
    });
  }
};

export const getFacultyTimetable = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    // Find the logged-in faculty
    const facultyList = await db.orm.public.Faculty.all();

    const faculty = facultyList.find((item) => item.userId === userId);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty profile not found",
      });
    }

    // Get all classes handled by this faculty
    const classes = await db.orm.public.Class.all();

    const facultyClasses = classes.filter(
      (item) => item.facultyId === faculty.id,
    );

    const classIds = facultyClasses.map((item) => item.id);

    // Get timetable
    const timetable = await db.orm.public.Timetable.all();

    const facultyTimetable = timetable.filter((item) =>
      classIds.includes(item.classId),
    );

    // Get subjects
    const subjects = await db.orm.public.Subject.all();

    const result = facultyTimetable.map((entry) => {
      const classInfo = facultyClasses.find(
        (item) => item.id === entry.classId,
      );

      const subject = subjects.find((item) => item.id === classInfo?.subjectId);

      return {
        id: entry.id,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room,
        classId: entry.classId,
        semester: classInfo?.semester ?? null,
        section: classInfo?.section ?? null,
        academicYear: classInfo?.academicYear ?? null,
        subject: subject
          ? {
              id: subject.id,
              code: subject.code,
              name: subject.name,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching faculty timetable:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch faculty timetable",
    });
  }
};
