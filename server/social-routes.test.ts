import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

vi.mock("./auth", () => ({
  setupAuth: vi.fn(),
  registerAuthRoutes: vi.fn(),
  isAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { id: "user-123" };
    req.isAuthenticated = () => true;
    next();
  },
}));

vi.mock("./storage", () => ({
  storage: {
    seedMetrics: vi.fn(),
    getOrCreatePatient: vi.fn(),
    createFriendRequest: vi.fn(),
    getFriendRequests: vi.fn(),
    acceptFriendRequest: vi.fn(),
    declineFriendRequest: vi.fn(),
    blockFriendRequest: vi.fn(),
    listFriends: vi.fn(),
    removeFriend: vi.fn(),
    getFriendFeed: vi.fn(),
    getSocialPrivacySettings: vi.fn(),
    updateSocialPrivacySettings: vi.fn(),
  },
}));

describe("Social Routes", () => {
  let app: express.Express;

  const friendshipResponse = {
    id: 1,
    requesterPatientId: 1,
    addresseePatientId: 2,
    status: "pending",
    createdAt: new Date(),
    respondedAt: null,
    requester: {
      patientId: 1,
      displayName: "Alice",
      profileImageUrl: null,
    },
    addressee: {
      patientId: 2,
      displayName: "Bob",
      profileImageUrl: null,
    },
  };

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app as any, app);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (storage.getOrCreatePatient as any).mockResolvedValue({ id: 1 });
  });

  it("creates a friend request", async () => {
    (storage.createFriendRequest as any).mockResolvedValue(friendshipResponse);

    const res = await request(app)
      .post("/api/social/friends/requests")
      .send({ email: "friend@example.com" });

    expect(res.status).toBe(201);
    expect(storage.createFriendRequest).toHaveBeenCalledWith(
      1,
      "friend@example.com",
      "user-123",
    );
  });

  it("lists incoming and outgoing friend requests", async () => {
    (storage.getFriendRequests as any).mockResolvedValue({
      incoming: [friendshipResponse],
      outgoing: [],
    });

    const res = await request(app).get("/api/social/friends/requests");

    expect(res.status).toBe(200);
    expect(res.body.incoming).toHaveLength(1);
  });

  it("returns paginated friend feed", async () => {
    (storage.getFriendFeed as any).mockResolvedValue({
      items: [
        {
          id: 1,
          actor: {
            patientId: 2,
            displayName: "Bob",
            profileImageUrl: null,
          },
          eventType: "habit_completed",
          habit: {
            id: 9,
            title: "Daily Walk",
          },
          eventDate: "2026-02-17",
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    });

    const res = await request(app).get("/api/social/feed?limit=10");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(storage.getFriendFeed).toHaveBeenCalledWith(
      1,
      "user-123",
      undefined,
      10,
    );
  });

  it("updates social privacy settings", async () => {
    (storage.updateSocialPrivacySettings as any).mockResolvedValue({
      patientId: 1,
      shareHabitActivity: false,
      showHabitName: true,
      updatedAt: new Date(),
    });

    const res = await request(app).put("/api/social/privacy").send({
      shareHabitActivity: false,
    });

    expect(res.status).toBe(200);
    expect(storage.updateSocialPrivacySettings).toHaveBeenCalledWith(
      1,
      { shareHabitActivity: false },
      "user-123",
    );
  });

  it("removes a friend", async () => {
    (storage.removeFriend as any).mockResolvedValue(undefined);

    const res = await request(app).delete("/api/social/friends/2");

    expect(res.status).toBe(204);
    expect(storage.removeFriend).toHaveBeenCalledWith(1, 2, "user-123");
  });
});
