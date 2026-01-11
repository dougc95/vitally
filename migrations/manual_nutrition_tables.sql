-- Create nutrition tables if they don't exist

CREATE TABLE IF NOT EXISTS nutrition_goals (
    id serial PRIMARY KEY NOT NULL,
    patient_id integer NOT NULL UNIQUE REFERENCES patients(id),
    calories integer DEFAULT 2000 NOT NULL,
    protein integer DEFAULT 150 NOT NULL,
    carbs integer DEFAULT 200 NOT NULL,
    fat integer DEFAULT 65 NOT NULL,
    updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meals (
    id serial PRIMARY KEY NOT NULL,
    patient_id integer NOT NULL REFERENCES patients(id),
    image_url text,
    meal_type text NOT NULL,
    date date NOT NULL,
    created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_items (
    id serial PRIMARY KEY NOT NULL,
    meal_id integer NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
    name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit text DEFAULT 'serving' NOT NULL,
    calories integer NOT NULL,
    protein integer NOT NULL,
    carbs integer NOT NULL,
    fat integer NOT NULL
);
