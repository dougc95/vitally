CREATE TABLE "goal_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer NOT NULL,
	"metric_code" text NOT NULL,
	"target_value" real NOT NULL,
	"unit_ucum" text NOT NULL,
	"direction" text DEFAULT 'maintain',
	"tolerance" real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"lifecycle_status" text DEFAULT 'active' NOT NULL,
	"month_start" date NOT NULL,
	"month_end" date NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"code" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"unit_ucum" text NOT NULL,
	"kind" text NOT NULL,
	"default_direction" text DEFAULT 'maintain',
	"default_tolerance" real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "observation_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"observation_id" integer NOT NULL,
	"metric_code" text NOT NULL,
	"value_numeric" real NOT NULL,
	"unit_ucum" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"status" text DEFAULT 'final' NOT NULL,
	"category" text DEFAULT 'vital-signs',
	"code" text DEFAULT 'body-metrics-panel',
	"effective_at" timestamp DEFAULT now() NOT NULL,
	"issued_at" timestamp DEFAULT now(),
	"note" text,
	"session_tag" text,
	"source" text DEFAULT 'manual'
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"display_name" text NOT NULL,
	"height_cm" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "patients_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "goal_targets" ADD CONSTRAINT "goal_targets_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_targets" ADD CONSTRAINT "goal_targets_metric_code_metrics_code_fk" FOREIGN KEY ("metric_code") REFERENCES "public"."metrics"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_components" ADD CONSTRAINT "observation_components_observation_id_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_components" ADD CONSTRAINT "observation_components_metric_code_metrics_code_fk" FOREIGN KEY ("metric_code") REFERENCES "public"."metrics"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");