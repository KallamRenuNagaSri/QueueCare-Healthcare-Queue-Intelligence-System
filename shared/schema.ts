import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  varchar,
  boolean,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// Preserved from original. Supports future staff authentication.
// ─────────────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  // Store password_hash only — never plaintext passwords.
  // Column kept as "password" for backward compatibility with existing schema;
  // the application layer is responsible for hashing before insert.
  password: text("password").notNull(),
  role: text("role").notNull().default("staff"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS
// Lookup table for valid departments. Prevents arbitrary strings in patients.
// ─────────────────────────────────────────────────────────────────────────────
export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("departments_name_unique_idx").on(table.name),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// PATIENTS
// Core queue entity. Each row is one patient check-in.
//
// Key design decisions:
//   • arrivalTime stored as bigint (Unix ms) so the frontend can call
//     new Date(arrivalTime) without any conversion.
//   • status uses string constants: "waiting" | "in_service" | "completed" | "cancelled"
//   • department kept as plain text (not FK to departments) so the system stays
//     resilient even if a department row is missing — the text column is the
//     authoritative identifier the frontend already uses.
//   • queuePosition and estimatedWaitTime are denormalised for read speed;
//     they are recalculated on every check-in.
// ─────────────────────────────────────────────────────────────────────────────
export const patients = pgTable(
  "patients",
  {
    id: serial("id").primaryKey(),
    // Human-readable patient code, e.g. "PT-4521". Generated on check-in.
    patientId: varchar("patient_id", { length: 20 }).notNull(),
    name: text("name").notNull(),
    department: text("department").notNull(),
    // valid values: "waiting" | "in_service" | "completed" | "cancelled"
    status: text("status").notNull().default("waiting"),
    priority: text("priority").notNull().default("normal"), // "normal" | "urgent"
    queuePosition: integer("queue_position").notNull(),
    estimatedWaitTime: integer("estimated_wait_time").notNull(), // minutes
    // Unix epoch milliseconds — compatible with frontend: new Date(arrivalTime)
    arrivalTime: bigint("arrival_time", { mode: "number" }).notNull(),
    // Nullable — set when patient is called in / service starts
    serviceStartTime: timestamp("service_start_time"),
    // Nullable — set when consultation is marked complete
    completionTime: timestamp("completion_time"),
  },
  (table) => [
    // Primary query pattern: fetch waiting queue for a department
    index("patients_department_status_idx").on(table.department, table.status),
    // Used by stats queries filtering on check-in date
    index("patients_arrival_time_idx").on(table.arrivalTime),
    // Used by complete-by-id endpoint
    index("patients_patient_id_idx").on(table.patientId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// QUEUE EVENTS
// Lightweight audit trail of status transitions for each patient.
// Keeps the patients table simple while providing history.
// ─────────────────────────────────────────────────────────────────────────────
export const queueEvents = pgTable(
  "queue_events",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    // valid values: "checked_in" | "called" | "in_service" | "completed" | "cancelled"
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("queue_events_patient_id_idx").on(table.patientId),
  ]
);

// ─────────────────────────────────────────────────────────────────────────────
// RELATIONS (Drizzle relational query support)
// ─────────────────────────────────────────────────────────────────────────────
export const patientsRelations = relations(patients, ({ many }) => ({
  events: many(queueEvents),
}));

export const queueEventsRelations = relations(queueEvents, ({ one }) => ({
  patient: one(patients, {
    fields: [queueEvents.patientId],
    references: [patients.id],
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS — used by routes for request validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for the POST /api/checkin request body.
 * Only name and department are accepted from the client — everything else
 * (patientId, status, queuePosition, arrivalTime, etc.) is generated server-side.
 */
export const insertPatientSchema = createInsertSchema(patients, {
  name: z.string().min(1, "Name is required").max(120, "Name too long").trim(),
  department: z.enum(["General", "Cardiology", "Neurology"], {
    errorMap: () => ({ message: "Department must be General, Cardiology, or Neurology" }),
  }),
}).pick({ name: true, department: true });

export const insertDepartmentSchema = createInsertSchema(departments).pick({
  name: true,
  active: true,
});

export const insertQueueEventSchema = createInsertSchema(queueEvents).pick({
  patientId: true,
  eventType: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPESCRIPT TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type QueueEvent = typeof queueEvents.$inferSelect;
export type InsertQueueEvent = z.infer<typeof insertQueueEventSchema>;

// Status and priority literal types — used by storage layer for safety
export type PatientStatus = "waiting" | "in_service" | "completed" | "cancelled";
export type PatientPriority = "normal" | "urgent";
export type QueueEventType = "checked_in" | "called" | "in_service" | "completed" | "cancelled";
