import { db } from "../prisma/db.js";

export const getSubjects = async (req, res) => {
  try {
    const subjects = await db.orm.public.Subject.all();

    res.status(200).json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
    });
  }
};

export const createSubject = async (req, res) => {
  try {
    const { name, code, departmentId, credits } = req.body;

    if (!name || !code || !departmentId || !credits) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check duplicate subject code
    const existingSubjects = await db.orm.public.Subject.all();

    if (existingSubjects.some((subject) => subject.code === code)) {
      return res.status(409).json({
        success: false,
        message: "Subject code already exists",
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

    const subject = await db.orm.public.Subject.create({
      name,
      code,
      departmentId: Number(departmentId),
      credits: Number(credits),
    });

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: subject,
    });
  } catch (error) {
    console.error("Error creating subject:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create subject",
    });
  }
};
