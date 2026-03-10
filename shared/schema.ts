import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  patientId: varchar("patient_id").notNull(), 
  name: text("name").notNull(),
  department: text("department").notNull(), 
  status: text("status").notNull().default("waiting"), // waiting, served
  queuePosition: integer("queue_position").notNull(),
  estimatedWaitTime: integer("estimated_wait_time").notNull(), // in minutes
  checkinTime: timestamp("checkin_time").defaultNow().notNull(),
});

export const insertPatientSchema = createInsertSchema(patients).pick({
  name: true,
  department: true,
});

export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
