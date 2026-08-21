import {
  patients,
  departments,
  queueEvents,
  users,
  type User,
  type Patient,
  type Department,
  type QueueEvent,
  type InsertPatient,
  type InsertQueueEvent,
  type PatientStatus,
  type QueueEventType,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, gte, desc } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// STATS RETURN TYPE
// ─────────────────────────────────────────────────────────────────────────────
export interface QueueStats {
  patientsToday: number;
  patientsWaiting: number;
  activeDepartments: number;
  averageWaitTime: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE INTERFACE
// All route handlers must go through this interface — never query the DB directly.
// ─────────────────────────────────────────────────────────────────────────────
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Departments
  getDepartments(): Promise<Department[]>;
  seedDepartments(): Promise<void>;

  // Patients / Queue
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatientById(id: number): Promise<Patient | undefined>;
  getPatientsByDepartment(department: string): Promise<Patient[]>;
  updatePatientStatus(id: number, status: PatientStatus): Promise<Patient | undefined>;

  // Queue Events
  createQueueEvent(event: InsertQueueEvent): Promise<QueueEvent>;
  getQueueEventsByPatient(patientId: number): Promise<QueueEvent[]>;

  // Stats
  getStats(): Promise<QueueStats>;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE STORAGE — single source of truth backed by PostgreSQL via Drizzle
// ─────────────────────────────────────────────────────────────────────────────
export class DatabaseStorage implements IStorage {

  // ── USERS ──────────────────────────────────────────────────────────────────

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  // ── DEPARTMENTS ────────────────────────────────────────────────────────────

  async getDepartments(): Promise<Department[]> {
    return db
      .select()
      .from(departments)
      .where(eq(departments.active, true))
      .orderBy(departments.name);
  }

  /**
   * Idempotent seed — inserts the three standard departments if they don't
   * already exist. Safe to call on every startup.
   */
  async seedDepartments(): Promise<void> {
    const DEFAULTS = ["General", "Cardiology", "Neurology"];

    for (const name of DEFAULTS) {
      // ON CONFLICT DO NOTHING — uniqueIndex on departments.name prevents dupes
      await db
        .insert(departments)
        .values({ name, active: true })
        .onConflictDoNothing();
    }
  }

  // ── PATIENTS / QUEUE ───────────────────────────────────────────────────────

  /**
   * Check a patient into the queue.
   * Calculates queue position and estimated wait time from the current
   * number of waiting patients in the same department.
   * Creates a "checked_in" queue event atomically after insert.
   */
  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    // Generate a human-readable patient code, e.g. "PT-4521"
    const patientId = "PT-" + Math.floor(1000 + Math.random() * 9000);

    // Count patients currently waiting in this department to determine position
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(
        and(
          eq(patients.department, insertPatient.department),
          eq(patients.status, "waiting")
        )
      );

    const queuePosition = Number(count) + 1;
    // 10 minutes per patient ahead (position 1 = 0 min wait, position 2 = 10 min, etc.)
    const estimatedWaitTime = (queuePosition - 1) * 10;

    const now = Date.now(); // Unix ms — stored as bigint, read back as number

    const [patient] = await db
      .insert(patients)
      .values({
        patientId,
        name: insertPatient.name,
        department: insertPatient.department,
        status: "waiting",
        priority: "normal",
        queuePosition,
        estimatedWaitTime,
        arrivalTime: now,
      })
      .returning();

    // Record the check-in event immediately after patient row is created
    await this.createQueueEvent({
      patientId: patient.id,
      eventType: "checked_in" satisfies QueueEventType,
    });

    return patient;
  }

  async getPatientById(id: number): Promise<Patient | undefined> {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id));
    return patient;
  }

  /**
   * Returns all patients in a department ordered by queue position.
   * Returns both waiting AND in_service patients — completed/cancelled are excluded.
   * The frontend filters further by status as needed.
   */
  async getPatientsByDepartment(department: string): Promise<Patient[]> {
    return db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.department, department),
          // Return active queue entries only (waiting + in_service)
          sql`${patients.status} IN ('waiting', 'in_service')`
        )
      )
      .orderBy(patients.queuePosition);
  }

  /**
   * Updates a patient's status and records the corresponding queue event.
   * Also sets serviceStartTime when transitioning to "in_service",
   * and completionTime when transitioning to "completed" or "cancelled".
   */
  async updatePatientStatus(
    id: number,
    status: PatientStatus
  ): Promise<Patient | undefined> {
    const now = new Date();

    // Build the update payload — only set timestamp fields on specific transitions
    const updateValues: Partial<typeof patients.$inferInsert> = { status };

    if (status === "in_service") {
      updateValues.serviceStartTime = now;
    } else if (status === "completed" || status === "cancelled") {
      updateValues.completionTime = now;
    }

    const [updated] = await db
      .update(patients)
      .set(updateValues)
      .where(eq(patients.id, id))
      .returning();

    if (!updated) return undefined;

    // Map status to the corresponding event type
    const eventTypeMap: Record<PatientStatus, QueueEventType> = {
      waiting:    "checked_in",
      in_service: "in_service",
      completed:  "completed",
      cancelled:  "cancelled",
    };

    await this.createQueueEvent({
      patientId: updated.id,
      eventType: eventTypeMap[status],
    });

    return updated;
  }

  // ── QUEUE EVENTS ───────────────────────────────────────────────────────────

  async createQueueEvent(event: InsertQueueEvent): Promise<QueueEvent> {
    const [queueEvent] = await db
      .insert(queueEvents)
      .values(event)
      .returning();
    return queueEvent;
  }

  async getQueueEventsByPatient(patientId: number): Promise<QueueEvent[]> {
    return db
      .select()
      .from(queueEvents)
      .where(eq(queueEvents.patientId, patientId))
      .orderBy(desc(queueEvents.createdAt));
  }

  // ── STATS ──────────────────────────────────────────────────────────────────

  /**
   * Returns real-time queue statistics.
   * patientsToday  — patients checked in since midnight local server time.
   * patientsWaiting — patients currently in "waiting" status.
   * activeDepartments — distinct departments with at least one waiting patient.
   * averageWaitTime — mean estimated_wait_time of waiting patients.
   */
  async getStats(): Promise<QueueStats> {
    // Start of today in Unix ms (server local time)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const [todayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(gte(patients.arrivalTime, todayStartMs));

    const [waitingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(eq(patients.status, "waiting"));

    const activeDeptsResult = await db
      .select({ department: patients.department })
      .from(patients)
      .where(eq(patients.status, "waiting"))
      .groupBy(patients.department);

    const [avgWaitResult] = await db
      .select({ avg: sql<number>`avg(estimated_wait_time)` })
      .from(patients)
      .where(eq(patients.status, "waiting"));

    return {
      patientsToday:     Number(todayResult?.count)   || 0,
      patientsWaiting:   Number(waitingResult?.count)  || 0,
      activeDepartments: activeDeptsResult.length,
      averageWaitTime:   Math.round(Number(avgWaitResult?.avg) || 0),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton — imported by routes.ts
// ─────────────────────────────────────────────────────────────────────────────
export const storage = new DatabaseStorage();
