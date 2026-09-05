import { db } from "../prisma/db.js";

export const getTimetable = async (req, res) => {
  try {
    const timetable = await db.orm.public.Timetable.all();

    res.status(200).json({
      success: true,
      data: timetable,
    });
  } catch (error) {
    console.error("Error fetching timetable:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch timetable",
    });
  }
};

export const createTimetable = async (req, res) => {
  try {
    const { classId, dayOfWeek, startTime, endTime, room } = req.body;

    if (!classId || dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Class ID, day, start time and end time are required",
      });
    }

    // Check class
    const classes = await db.orm.public.Class.all();

    const selectedClass = classes.find((item) => item.id === Number(classId));

    if (!selectedClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Validate day
    const day = Number(dayOfWeek);

    if (day < 0 || day > 6) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek must be between 0 and 6",
      });
    }

    const timetable = await db.orm.public.Timetable.create({
      classId: Number(classId),
      dayOfWeek: day,
      startTime,
      endTime,
      room: room || null,
    });

    res.status(201).json({
      success: true,
      message: "Timetable created successfully",
      data: timetable,
    });
  } catch (error) {
    console.error("Error creating timetable:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create timetable",
    });
  }
};
