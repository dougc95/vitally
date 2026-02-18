import type { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import bcrypt from "bcrypt";
import connectPgSimple from "connect-pg-simple";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { pool } from "./db";

// Extend Express.User interface
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}

// Password hashing utilities
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Configure Passport Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()));

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        if (!user.password) {
          return done(null, false, {
            message:
              "This account uses Google sign-in. Please sign in with Google.",
          });
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid email or password" });
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword as Express.User);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// Configure Passport Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          if (!email) {
            return done(new Error("No email returned from Google"));
          }

          // Look up by googleId first
          const [byGoogleId] = await db
            .select()
            .from(users)
            .where(eq(users.googleId, profile.id));

          if (byGoogleId) {
            const { password: _, ...userWithoutPassword } = byGoogleId;
            return done(null, userWithoutPassword as Express.User);
          }

          // Link to existing account by email
          const [byEmail] = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

          if (byEmail) {
            const [updated] = await db
              .update(users)
              .set({ googleId: profile.id })
              .where(eq(users.id, byEmail.id))
              .returning();
            const { password: _, ...userWithoutPassword } = updated;
            return done(null, userWithoutPassword as Express.User);
          }

          // Create new user
          const [newUser] = await db
            .insert(users)
            .values({
              email,
              googleId: profile.id,
              firstName: profile.name?.givenName || null,
              lastName: profile.name?.familyName || null,
              profileImageUrl: profile.photos?.[0]?.value || null,
            })
            .returning();

          const { password: _, ...userWithoutPassword } = newUser;
          return done(null, userWithoutPassword as Express.User);
        } catch (err) {
          return done(err as Error);
        }
      },
    ),
  );
}

// Session serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return done(null, false);
    }

    done(null, user as Express.User);
  } catch (err) {
    done(err);
  }
});

// Setup authentication middleware
export async function setupAuth(app: Express): Promise<void> {
  // Validate required environment variables
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  // Configure session store
  const PgSession = connectPgSimple(session);
  const sessionStore = new PgSession({
    pool,
    tableName: "sessions",
    createTableIfMissing: false,
  });

  // Configure session middleware
  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
}

// Authentication middleware
export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// Register authentication routes
export function registerAuthRoutes(app: Express): void {
  // Register new user
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      // Check for existing user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));

      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
        })
        .returning();

      // Auto-login after registration
      const { password: _, ...userWithoutPassword } = newUser;
      req.login(userWithoutPassword as Express.User, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return res
            .status(500)
            .json({ message: "Registration successful but login failed" });
        }
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      "local",
      (
        err: Error | null,
        user: Express.User | false,
        info: { message: string },
      ) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res
            .status(401)
            .json({ message: info?.message || "Invalid credentials" });
        }
        req.login(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          res.json(user);
        });
      },
    )(req, res, next);
  });

  // Logout
  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    });
  });

  // Get current user
  app.get("/api/auth/user", isAuthenticated, (req: Request, res: Response) => {
    res.json(req.user);
  });

  // Google OAuth — initiate
  app.get(
    "/api/auth/google",
    (req: Request, res: Response, next: NextFunction) => {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res
          .status(501)
          .json({ message: "Google OAuth is not configured on this server" });
      }
      passport.authenticate("google", { scope: ["profile", "email"] })(
        req,
        res,
        next,
      );
    },
  );

  // Google OAuth — callback
  app.get(
    "/api/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect("/login?error=google");
      }
      passport.authenticate("google", {
        failureRedirect: "/login?error=google",
      })(req, res, next);
    },
    (_req: Request, res: Response) => {
      res.redirect("/");
    },
  );
}
