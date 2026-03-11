import { patients, users, type User, type Patient, type InsertPatient } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatientsByDepartment(department: string): Promise<Patient[]>;
  getStats(): Promise<{
    patientsToday: number;
    patientsWaiting: number;
    activeDepartments: number;
    averageWaitTime: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    // Generate a simple ID
    const patientId = "PT-" + Math.floor(1000 + Math.random() * 9000);
    
    // Find queue position
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(and(
        eq(patients.department, insertPatient.department),
        eq(patients.status, "waiting")
      ));
    
    const queuePosition = Number(count) + 1;
    // Base wait time = 15 mins per patient ahead
    const estimatedWaitTime = (queuePosition - 1) * 15;

    const [patient] = await db.insert(patients).values({
      ...insertPatient,
      patientId,
      status: "waiting",
      queuePosition,
      estimatedWaitTime,
    }).returning();
    
    return patient;
  }

  async getPatientsByDepartment(department: string): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(and(
        eq(patients.department, department),
        eq(patients.status, "waiting")
      ))
      .orderBy(patients.queuePosition);
  }

  async getStats() {
    const [todayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients);
      
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
      patientsToday: Number(todayResult.count) || 0,
      patientsWaiting: Number(waitingResult.count) || 0,
      activeDepartments: activeDeptsResult.length,
      averageWaitTime: Math.round(Number(avgWaitResult.avg) || 0),
    };
  }
}

export const storage = new DatabaseStorage();