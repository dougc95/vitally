CREATE TABLE IF NOT EXISTS "friendships" (
	"id" serial PRIMARY KEY NOT NULL,
	"requester_patient_id" integer NOT NULL,
	"addressee_patient_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	CONSTRAINT "friendships_no_self_chk" CHECK ("friendships"."requester_patient_id" <> "friendships"."addressee_patient_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_activity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_patient_id" integer NOT NULL,
	"habit_id" integer NOT NULL,
	"habit_entry_id" integer,
	"event_type" text NOT NULL,
	"event_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipe_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"recipe_id" integer,
	"generated_recipe" text,
	"cuisine_mode" text,
	"was_cooked" boolean DEFAULT false,
	"rating" integer,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"cuisine_mode" text,
	"ingredients" text NOT NULL,
	"instructions" text NOT NULL,
	"prep_time" integer,
	"cook_time" integer,
	"servings" integer DEFAULT 2,
	"difficulty" text DEFAULT 'medium',
	"calories" integer,
	"protein" integer,
	"carbs" integer,
	"fat" integer,
	"image_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_privacy_settings" (
	"patient_id" integer PRIMARY KEY NOT NULL,
	"share_habit_activity" boolean DEFAULT true NOT NULL,
	"show_habit_name" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"name" text NOT NULL,
	"quantity" real DEFAULT 1,
	"unit" text DEFAULT 'unit',
	"category" text DEFAULT 'other',
	"image_url" text,
	"expires_at" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" varchar;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'friendships_requester_patient_id_patients_id_fk'
  ) THEN
    ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_patient_id_patients_id_fk" FOREIGN KEY ("requester_patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'friendships_addressee_patient_id_patients_id_fk'
  ) THEN
    ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_patient_id_patients_id_fk" FOREIGN KEY ("addressee_patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'habit_activity_events_actor_patient_id_patients_id_fk'
  ) THEN
    ALTER TABLE "habit_activity_events" ADD CONSTRAINT "habit_activity_events_actor_patient_id_patients_id_fk" FOREIGN KEY ("actor_patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'habit_activity_events_habit_id_habits_id_fk'
  ) THEN
    ALTER TABLE "habit_activity_events" ADD CONSTRAINT "habit_activity_events_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'habit_activity_events_habit_entry_id_habit_entries_id_fk'
  ) THEN
    ALTER TABLE "habit_activity_events" ADD CONSTRAINT "habit_activity_events_habit_entry_id_habit_entries_id_fk" FOREIGN KEY ("habit_entry_id") REFERENCES "public"."habit_entries"("id") ON DELETE set null ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recipe_history_patient_id_patients_id_fk'
  ) THEN
    ALTER TABLE "recipe_history" ADD CONSTRAINT "recipe_history_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'recipe_history_recipe_id_saved_recipes_id_fk'
  ) THEN
    ALTER TABLE "recipe_history" ADD CONSTRAINT "recipe_history_recipe_id_saved_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."saved_recipes"("id") ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'saved_recipes_patient_id_patients_id_fk'
  ) THEN
    ALTER TABLE "saved_recipes" ADD CONSTRAINT "saved_recipes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_privacy_settings_patient_id_patients_id_fk'
  ) THEN
    ALTER TABLE "social_privacy_settings" ADD CONSTRAINT "social_privacy_settings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_ingredients_patient_id_patients_id_fk'
  ) THEN
    ALTER TABLE "user_ingredients" ADD CONSTRAINT "user_ingredients_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_requester_addressee_unique" ON "friendships" USING btree ("requester_patient_id","addressee_patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_requester_status_idx" ON "friendships" USING btree ("requester_patient_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_addressee_status_idx" ON "friendships" USING btree ("addressee_patient_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_activity_events_created_at_idx" ON "habit_activity_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "habit_activity_events_actor_created_at_idx" ON "habit_activity_events" USING btree ("actor_patient_id","created_at");--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_google_id_unique'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");
  END IF;
END $$;