CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"queue_position" integer NOT NULL,
	"estimated_wait_time" integer NOT NULL,
	"arrival_time" bigint NOT NULL,
	"service_start_time" timestamp,
	"completion_time" timestamp
);
--> statement-breakpoint
CREATE TABLE "queue_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "queue_events" ADD CONSTRAINT "queue_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "departments_name_unique_idx" ON "departments" USING btree ("name");--> statement-breakpoint
CREATE INDEX "patients_department_status_idx" ON "patients" USING btree ("department","status");--> statement-breakpoint
CREATE INDEX "patients_arrival_time_idx" ON "patients" USING btree ("arrival_time");--> statement-breakpoint
CREATE INDEX "patients_patient_id_idx" ON "patients" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "queue_events_patient_id_idx" ON "queue_events" USING btree ("patient_id");