import type { Express } from "express";
import type { Server } from "http";

// STEP 1 — Patient type
interface Patient {
  id: number;
  name: string;
  department: string;
  arrivalTime: number;
  status: "waiting" | "completed";
}

// STEP 2 — In-memory queue storage
const departmentQueues: Record<string, Patient[]> = {};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Simple health check endpoint
  app.get("/api/health", (_req, res) => {
    return res.status(200).json({ status: "API running" });
  });

  // Simple login endpoint (no database, accepts any credentials)
  app.post("/api/login", (req, res) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        email,
        role: "staff",
      },
    });
  });

  // 1) POST /api/checkin
  app.post("/api/checkin", (req, res) => {
    const { name, department } = req.body as {
      name?: string;
      department?: string;
    };

    if (!name || !department) {
      return res
        .status(400)
        .json({ message: "Both name and department are required" });
    }

    const id = Date.now();
    const arrivalTime = Date.now();

    const patient: Patient = {
      id,
      name,
      department,
      arrivalTime,
      status: "waiting",
    };

    if (!departmentQueues[department]) {
      departmentQueues[department] = [];
    }

    departmentQueues[department].push(patient);

    const queuePosition = departmentQueues[department].length;

    console.log("[QueueCare] Patient check-in:", {
      id: patient.id,
      name: patient.name,
      department: patient.department,
      queuePosition,
    });

    return res.status(201).json({
      message: "Patient added to queue",
      queuePosition,
    });
  });

  // 2) GET /api/queue/:department
  app.get("/api/queue/:department", (req, res) => {
    const { department } = req.params;
    const queue = departmentQueues[department] || [];

    console.log("[QueueCare] Queue retrieval:", {
      department,
      totalPatients: queue.length,
    });

    return res.status(200).json({
      department,
      totalPatients: queue.length,
      queue,
    });
  });

  // 3) GET /api/wait-time/:department
  app.get("/api/wait-time/:department", (req, res) => {
    const { department } = req.params;
    const queue = departmentQueues[department] || [];

    const patientsAhead = queue.length;
    const estimatedWaitTimeMinutes = patientsAhead * 10;

    console.log("[QueueCare] Wait time retrieval:", {
      department,
      patientsAhead,
      estimatedWaitTimeMinutes,
    });

    return res.status(200).json({
      department,
      patientsAhead,
      estimatedWaitTimeMinutes,
    });
  });

  // 4) POST /api/complete/:id
  app.post("/api/complete/:id", (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid patient id" });
    }

    let found = false;
    let foundDepartment: string | null = null;

    for (const [department, queue] of Object.entries(departmentQueues)) {
      const index = queue.findIndex((patient) => patient.id === id);

      if (index !== -1) {
        queue.splice(index, 1);
        found = true;
        foundDepartment = department;

        console.log("[QueueCare] Patient completion:", {
          id,
          department,
        });

        break;
      }
    }

    if (!found) {
      return res.status(404).json({ message: "Patient not found in any queue" });
    }

    return res.json({ message: "Patient consultation completed" });
  });

  // 5) GET /api/all-queues
  app.get("/api/all-queues", (_req, res) => {
    console.log("[QueueCare] All queues retrieval", {
      departments: Object.keys(departmentQueues),
    });

    return res.status(200).json(departmentQueues);
  });

  return httpServer;
}
