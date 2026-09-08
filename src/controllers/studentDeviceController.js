import { db } from "../prisma/db.js";

export const registerStudentDevice = async (req, res) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey || typeof publicKey !== "string") {
      return res.status(400).json({
        success: false,
        message: "publicKey is required",
      });
    }

    // Find the student linked to the logged-in user
    const students = await db.orm.public.Student.where({
      userId: req.user.id,
    }).all();

    const student = students[0];

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    // Check whether this public key already exists
    const existingDevices = await db.orm.public.StudentDevice.where({
      publicKey,
    }).all();

    if (existingDevices.length > 0) {
      const existingDevice = existingDevices[0];

      // Same student + same key
      if (existingDevice.studentId === student.id) {
        const updatedDevice = await db.orm.public.StudentDevice.where({
          id: existingDevice.id,
        }).update({
          isActive: true,
        });

        return res.status(200).json({
          success: true,
          message: "Device already registered and activated",
          data: {
            id: updatedDevice.id,
            studentId: updatedDevice.studentId,
            publicKey: updatedDevice.publicKey,
            isActive: updatedDevice.isActive,
          },
        });
      }

      // Same public key cannot belong to another student
      return res.status(409).json({
        success: false,
        message: "This public key is already registered to another student",
      });
    }

    // Register new device
    const device = await db.orm.public.StudentDevice.create({
      studentId: student.id,
      publicKey,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Device registered successfully",
      data: {
        id: device.id,
        studentId: device.studentId,
        publicKey: device.publicKey,
        isActive: device.isActive,
      },
    });
  } catch (error) {
    console.error("Register student device error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to register student device",
    });
  }
};
