import { db } from "../prisma/db.js";

export const getDepartments = async (req, res) => {
  try {
    const departments = await db.orm.public.Department.all();

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error("Error fetching departments:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
    });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Name and code are required",
      });
    }

    const department = await db.orm.public.Department.create({
      name,
      code,
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error("Error creating department:", error);

    if (error?.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Department code already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create department",
    });
  }
};
