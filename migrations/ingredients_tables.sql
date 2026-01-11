-- Ingredients & Recipes Feature Migration
-- Run this after the existing migrations

-- User Ingredients (Pantry)
CREATE TABLE IF NOT EXISTS user_ingredients (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    name TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit TEXT DEFAULT 'unit',
    category TEXT DEFAULT 'other',
    image_url TEXT,
    expires_at DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_ingredients_patient ON user_ingredients(patient_id);

-- Saved Recipes
CREATE TABLE IF NOT EXISTS saved_recipes (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    title TEXT NOT NULL,
    description TEXT,
    cuisine_mode TEXT,
    ingredients TEXT NOT NULL, -- JSON array
    instructions TEXT NOT NULL, -- JSON array
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    servings INTEGER DEFAULT 2,
    difficulty TEXT DEFAULT 'medium',
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_saved_recipes_patient ON saved_recipes(patient_id);

-- Recipe History (tracking generated recipes)
CREATE TABLE IF NOT EXISTS recipe_history (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    recipe_id INTEGER REFERENCES saved_recipes(id) ON DELETE CASCADE,
    generated_recipe TEXT, -- JSON for non-saved recipes
    cuisine_mode TEXT,
    was_cooked BOOLEAN DEFAULT FALSE,
    rating INTEGER, -- 1-5
    generated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recipe_history_patient ON recipe_history(patient_id);
