CREATE TABLE "calculations" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"name" text NOT NULL,
	"age" integer NOT NULL,
	"sex" text NOT NULL,
	"weight_kg" real NOT NULL,
	"height_cm" real NOT NULL,
	"body_fat_pct" real NOT NULL,
	"activity_level" text NOT NULL,
	"activity_factor" real NOT NULL,
	"goal_type" text NOT NULL,
	"goal_adjustment_kcal" integer NOT NULL,
	"protein_factor" real NOT NULL,
	"fat_g_per_kg" real NOT NULL,
	"use_ffm_when_high_bf" boolean DEFAULT true,
	"protein_factor_ffm" real DEFAULT 2.2,
	"bf_threshold_pct" real DEFAULT 20,
	"results" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "habit_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"date" date NOT NULL,
	"completed" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"title" text NOT NULL,
	"color" text NOT NULL,
	"icon" text,
	"start_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "calculations" ADD CONSTRAINT "calculations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_entries" ADD CONSTRAINT "habit_entries_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;