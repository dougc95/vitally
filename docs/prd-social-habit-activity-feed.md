# PRD — Friends Habit Activity Feed (Private-by-Default)

## 1) Context

Vitally currently supports personal habit tracking, but all data access is owner-only.
This PRD defines a new social feature where users can watch their friends' **habit activity only**, while all other domains remain private (measurements, goals, nutrition, calculations, ingredients, recipes, imports/exports).

## 2) Repository analysis summary

### What already exists

- Session-based authentication and protected routes (`isAuthenticated`) are already enforced on API endpoints.
- App-layer ownership checks are centralized in storage methods (via `verifyOwnership`) and reused by habit operations.
- Habits are modeled with `habits` and `habit_entries`, and toggling a completion is already implemented.
- Frontend already has complete habit views (`/habits`, `/habits/:id`) and shared API contract usage (`shared/routes.ts`).

### What is missing

- No friend/follow/social graph model.
- No social feed endpoints.
- No privacy settings for shareable habit activity.
- No UI route/page for friends feed.

## 3) Problem statement

Users can track habits, but cannot stay accountable with friends. We need lightweight social visibility for habit activity without exposing sensitive health data.

## 4) Goals

1. Enable friend relationships (request/accept/remove/block).
2. Show a reverse-chronological feed of friend habit activity.
3. Keep all non-habit domains private by default.
4. Give users explicit controls for what habit activity is shared.
5. Preserve existing authorization guarantees (no cross-user leakage).

## 5) Non-goals

- Public profiles or discoverability by strangers.
- Sharing measurements/goals/nutrition/calculations.
- Comments/reactions/chat in v1.
- Real-time sockets/push notifications in v1.

## 6) User stories

1. As a user, I can send a friend request using email.
2. As a user, I can accept/decline incoming friend requests.
3. As a user, I can remove or block a friend.
4. As a user, I can view a feed of accepted friends' habit activity.
5. As a user, I can disable sharing my habit activity at any time.
6. As a user, I know all other health data remains private.

## 7) Functional requirements

### FR-1: Friendship lifecycle

- Users can create outgoing friend requests.
- Recipient can accept or decline.
- Either party can remove friendship.
- Blocking prevents future requests and hides feed activity both ways.
- Duplicate or self-friend requests are rejected.

### FR-2: Habit activity event capture

- Generate feed events when a user:
  - marks a habit complete,
  - unmarks a completion (optional event type; see open questions),
  - creates a new habit (optional in v1; default off).
- Events store minimal data needed for feed rendering.

### FR-3: Friends feed

- Feed returns events from accepted friends only.
- Ordered newest-first with cursor pagination.
- Default page size 25, max 100.
- Feed item must not include non-habit data.

### FR-4: Privacy controls

Per-user settings:

- `shareHabitActivity` (default: `true`)
- `showHabitName` (default: `true`)

Behavior:

- If `shareHabitActivity = false`, no new events are visible to friends and old events are hidden.
- If `showHabitName = false`, feed item text is generic (e.g., "completed a habit").

### FR-5: Access control boundaries

- Existing owner-only endpoints remain unchanged.
- Social endpoints only return:
  - friend relationship metadata,
  - permitted habit activity events,
  - minimal public profile info (`displayName`, optional avatar).
- No endpoint may expose measurements/goals/nutrition data across users.

### FR-6: UX requirements

- New "Friends" nav entry and `/friends` page.
- Tabs:
  - Feed
  - Friends
  - Requests
  - Privacy settings
- Empty states:
  - no friends yet,
  - no activity yet,
  - sharing disabled.

## 8) Data model (Postgres/Drizzle)

### New tables

1. `friendships`
   - `id` serial PK
   - `requesterPatientId` int FK `patients.id`
   - `addresseePatientId` int FK `patients.id`
   - `status` text enum: `pending | accepted | declined | blocked`
   - `createdAt` timestamp default now
   - `respondedAt` timestamp nullable
   - Unique pair constraint per requester/addressee
   - Check constraint requester != addressee

2. `habit_activity_events`
   - `id` serial PK
   - `actorPatientId` int FK `patients.id`
   - `habitId` int FK `habits.id`
   - `habitEntryId` int FK `habit_entries.id` nullable (for non-entry events)
   - `eventType` text enum: `habit_completed | habit_uncompleted | habit_created`
   - `eventDate` date nullable (habit completion date)
   - `createdAt` timestamp default now

3. `social_privacy_settings`
   - `patientId` int PK/FK `patients.id`
   - `shareHabitActivity` boolean default true
   - `showHabitName` boolean default true
   - `updatedAt` timestamp default now

### Indexes

- `friendships`:
  - `(requester_patient_id, status)`
  - `(addressee_patient_id, status)`
- `habit_activity_events`:
  - `(created_at desc)`
  - `(actor_patient_id, created_at desc)`
- `social_privacy_settings`:
  - PK index only

## 9) API contract additions (`shared/routes.ts`)

Namespace: `api.social`

1. `POST /api/social/friends/requests`
   - input: `{ email: string }`
   - output: created pending request summary

2. `GET /api/social/friends/requests`
   - output: `{ incoming: FriendRequest[], outgoing: FriendRequest[] }`

3. `POST /api/social/friends/requests/:id/accept`
4. `POST /api/social/friends/requests/:id/decline`
5. `POST /api/social/friends/requests/:id/block`

6. `GET /api/social/friends`
   - output: accepted friends list (minimal profile)

7. `DELETE /api/social/friends/:friendPatientId`

8. `GET /api/social/feed?cursor=<token>&limit=<n>`
   - output: `{ items: FeedItem[], nextCursor: string | null }`

9. `GET /api/social/privacy`
10. `PUT /api/social/privacy`
   - input: `{ shareHabitActivity?: boolean; showHabitName?: boolean }`

### Feed item shape (v1)

- `id: number`
- `actor: { patientId: number; displayName: string; profileImageUrl?: string | null }`
- `eventType: "habit_completed" | "habit_uncompleted" | "habit_created"`
- `habit: { id: number; title?: string }` (title optional when hidden)
- `eventDate?: string`
- `createdAt: string`

## 10) Backend implementation plan

### `shared/schema.ts`

- Add social tables, relations, insert schemas, select types.

### `shared/routes.ts`

- Add `api.social.*` route contracts and error schemas.

### `server/storage.ts`

- Extend `IStorage` with social methods.
- Implement:
  - friend request workflows,
  - friendship status validation,
  - feed query filtered to accepted friends,
  - privacy settings CRUD,
  - event creation helpers.
- Add helper `verifyFriendAccess(actorPatientId, viewerUserId)` for feed safety.

### `server/routes.ts`

- Register social endpoints under `isAuthenticated`.
- Parse/validate with zod schemas.
- Reuse `getOrCreatePatient(req)` for current user identity.

### Habit event hooks

- On `toggleHabitEntry`, write `habit_activity_events` record when completion state changes.
- Respect actor privacy settings at read-time (not write-time) to allow reversible privacy behavior.

## 11) Frontend implementation plan

### New files

- `client/src/hooks/use-social.ts`
  - React Query hooks for requests, friends, feed, privacy updates.
- `client/src/pages/Friends.tsx`
  - Feed + requests + privacy tabs.
- `client/src/components/social/*`
  - Feed list items, request cards, privacy form.

### Existing files to update

- `client/src/App.tsx`: add `/friends` protected route.
- `client/src/components/Sidebar.tsx`: add nav item "Friends".

## 12) Privacy model (explicit)

1. **Default private** across all domains.
2. Social sharing applies only to habit activity events.
3. Feed cannot query or join measurements/goals/nutrition/calculations.
4. Unfriended/blocked users lose visibility immediately.
5. Privacy toggle can hide historical feed items.

## 13) Acceptance criteria

### Functional

- Users can complete full request -> accept -> feed flow.
- Feed only shows accepted friends.
- Privacy toggles immediately affect feed visibility.

### Security

- User A cannot access User B private endpoints (existing + social) unless friendship and endpoint allows it.
- Blocked relationships return no feed items in either direction.
- No social endpoint exposes measurement/goal/nutrition entities.

### Performance

- Feed p95 API latency < 300ms for 25 items with 100 friends.

## 14) Testing strategy

### Route/integration tests (`server/routes.test.ts` and new social tests)

- Send request to non-friend data -> 403/404 as appropriate.
- Feed includes only accepted-friend events.
- Privacy off hides events.
- Block removes visibility.
- Self-request and duplicate request are rejected.

### Storage tests

- Friendship state transitions valid/invalid paths.
- Cursor pagination determinism.

## 15) Rollout plan

### Phase 1 (backend foundation)

- Schema + migration
- Storage + routes
- Tests

### Phase 2 (frontend v1)

- Friends page + hooks
- Sidebar/App wiring
- Empty/loading/error states

### Phase 3 (polish)

- Better event text
- Optional digest/notifications
- Anti-abuse tuning (rate limits)

## 16) Metrics

- % active users with >=1 friend
- weekly feed viewers / DAU
- avg friend requests sent/accepted
- privacy toggle usage rate
- zero confirmed cross-user data leaks

## 17) Risks and mitigations

1. **Risk:** privacy regression due to new joins.
   - **Mitigation:** centralize friendship + privacy filters in storage and test matrix.
2. **Risk:** feed bloat over time.
   - **Mitigation:** cursor pagination + optional retention policy later.
3. **Risk:** abuse/spam friend requests.
   - **Mitigation:** endpoint rate limiting + block support.

## 18) Open questions

1. Should uncomplete actions be visible, or only completions?
2. Should historical events stay visible after unfriending, or be hidden immediately?
3. Should habit titles be hidden by default for new users (`showHabitName=false`) for stricter privacy?
4. Do we need an app notification badge for pending requests in v1?
