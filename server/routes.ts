import type { Express } from "express";
import type { Server } from "http";
import { fromZodError } from "zod-validation-error";
import { insertPatientSchema } from "@shared/schema";
import { storage } from "./storage";
import { log } from "./logger";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Seed departments on startup — idempotent, safe to call every time
  await storage.seedDepartments();

  // ── HEALTH ────────────────────────────────────────────────────────────────

  app.get("/api/health", (_req, res) => {
    return res.status(200).json({ status: "API running" });
  });

  // ── AUTH (stub — no real auth yet) ───────────────────────────────────────
  // Accepts any credentials. Real authentication will be added in a future task.

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
      user: { email, role: "staff" },
    });
  });

  // ── 1) POST /api/checkin ──────────────────────────────────────────────────
  // Validates the request body using the shared Zod schema, then persists the
  // patient to PostgreSQL via the storage layer.

  app.post("/api/checkin", async (req, res) => {
    // Validate with Zod — gives user-friendly error messages
    const parsed = insertPatientSchema.safeParse(req.body);

    if (!parsed.success) {
      const readable = fromZodError(parsed.error);
      return res.status(400).json({ message: readable.message });
    }

    try {
      const patient = await storage.createPatient(parsed.data);

      log(`Patient check-in: id=${patient.id} name=${patient.name} dept=${patient.department} pos=${patient.queuePosition}`, "QueueCare");

      return res.status(201).json({
        message: "Patient added to queue",
        queuePosition: patient.queuePosition,
        patientId: patient.patientId,
      });
    } catch (err) {
      console.error("[QueueCare] Check-in error:", err);
      return res.status(500).json({ message: "Failed to check in patient" });
    }
  });

  // ── 2) GET /api/queue/:department ─────────────────────────────────────────
  // Returns all active (waiting + in_service) patients for the given department,
  // ordered by queue position. Response shape preserved exactly as the frontend
  // expects: { department, totalPatients, queue: Patient[] }

  app.get("/api/queue/:department", async (req, res) => {
    const { department } = req.params;

    try {
      const queue = await storage.getPatientsByDepartment(department);

      log(`Queue retrieval: dept=${department} total=${queue.length}`, "QueueCare");

      return res.status(200).json({
        department,
        totalPatients: queue.length,
        queue,
      });
    } catch (err) {
      console.error("[QueueCare] Queue retrieval error:", err);
      return res.status(500).json({ message: "Failed to retrieve queue" });
    }
  });

  // ── 3) GET /api/stats ─────────────────────────────────────────────────────
  // Implements the endpoint defined in shared/routes.ts that was previously
  // missing. Returns live counts from PostgreSQL.

  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      return res.status(200).json(stats);
    } catch (err) {
      console.error("[QueueCare] Stats error:", err);
      return res.status(500).json({ message: "Failed to retrieve stats" });
    }
  });

  // ── 4) GET /api/wait-time/:department ────────────────────────────────────
  // Calculates current wait time from the live queue length in the database.

  app.get("/api/wait-time/:department", async (req, res) => {
    const { department } = req.params;

    try {
      const queue = await storage.getPatientsByDepartment(department);
      const waitingCount = queue.filter((p) => p.status === "waiting").length;
      const estimatedWaitTimeMinutes = waitingCount * 10;

      log(`Wait time: dept=${department} ahead=${waitingCount} mins=${estimatedWaitTimeMinutes}`, "QueueCare");

      return res.status(200).json({
        department,
        patientsAhead: waitingCount,
        estimatedWaitTimeMinutes,
      });
    } catch (err) {
      console.error("[QueueCare] Wait time error:", err);
      return res.status(500).json({ message: "Failed to calculate wait time" });
    }
  });

  // ── 5) POST /api/complete/:id ─────────────────────────────────────────────
  // Marks a patient as "completed" in PostgreSQL. The id is the patient's
  // numeric primary key (patient.id from the queue rows).
  // The frontend currently manages the "completed" display state locally, but
  // this endpoint persists the final status to the database.

  app.post("/api/complete/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid patient id" });
    }

    try {
      const updated = await storage.updatePatientStatus(id, "completed");

      if (!updated) {
        return res.status(404).json({ message: "Patient not found" });
      }

      log(`Patient completed: id=${updated.id} dept=${updated.department}`, "QueueCare");

      return res.status(200).json({ message: "Patient consultation completed" });
    } catch (err) {
      console.error("[QueueCare] Complete error:", err);
      return res.status(500).json({ message: "Failed to complete patient" });
    }
  });

  // ── 6) GET /api/all-queues ────────────────────────────────────────────────
  // Returns active queue data for all departments. Useful for admin overview.

  app.get("/api/all-queues", async (_req, res) => {
    const DEPARTMENTS = ["General", "Cardiology", "Neurology"];

    try {
      const result: Record<string, any[]> = {};

      await Promise.all(
        DEPARTMENTS.map(async (dept) => {
          result[dept] = await storage.getPatientsByDepartment(dept);
        })
      );

      log(`All queues retrieval: depts=${DEPARTMENTS.join(",")}`, "QueueCare");

      return res.status(200).json(result);
    } catch (err) {
      console.error("[QueueCare] All-queues error:", err);
      return res.status(500).json({ message: "Failed to retrieve all queues" });
    }
  });

  // ── 7) GET /api/departments ───────────────────────────────────────────────
  // New endpoint — returns active departments from the database.

  app.get("/api/departments", async (_req, res) => {
    try {
      const depts = await storage.getDepartments();
      return res.status(200).json(depts);
    } catch (err) {
      console.error("[QueueCare] Departments error:", err);
      return res.status(500).json({ message: "Failed to retrieve departments" });
    }
  });

  return httpServer;
}
