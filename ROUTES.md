# Tournament Management App - Route Structure

## Overview
Complete MVP route structure for a tournament management application built with Next.js 14+ App Router, TypeScript, and Clerk authentication.

## Route Groups

### 📂 (public) - Public Routes
Routes accessible without authentication.

- **`/`** - Landing page with hero section, features, and call-to-action
- **`/join/[token]`** - Join tournament page (accepts invitation token)

### 🔐 (auth) - Authentication Routes
Handled by Clerk with custom UI.

- **`/sign-in`** - Custom sign-in page with email/password
- **`/sign-up`** - Custom sign-up page with email verification flow

### 🔒 (protected) - Protected Routes
Requires authentication. Wrapped in protected layout with navigation.

#### Dashboard
- **`/dashboard`** - User dashboard with tournament overview and quick actions

#### Tournament Management
- **`/tournaments/create`** - Create new tournament form
- **`/tournaments/[id]`** - Tournament details and overview
- **`/tournaments/[id]/players`** - Manage tournament participants
- **`/tournaments/[id]/matches`** - View and manage matches/bracket
- **`/tournaments/[id]/invite`** - Generate invitation links and QR codes
- **`/tournaments/[id]/settings`** - Tournament configuration and danger zone

---

## API Routes (Route Handlers)

All API routes return JSON and require authentication.

### Tournaments

#### `POST /api/tournaments`
Create a new tournament.

**Request Body:**
```json
{
  "name": "Summer Championship 2026",
  "description": "Annual summer tournament",
  "format": "single-elimination",
  "maxParticipants": 16,
  "startDate": "2026-07-01T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "tournament": {
    "id": "tournament_123",
    "name": "Summer Championship 2026",
    "status": "draft",
    "organizerId": "user_456"
  }
}
```

**TODO:**
- Validate request body
- Create tournament in database
- Generate invitation token

---

#### `GET /api/tournaments`
Get all tournaments (user's tournaments or participating).

**Query Params:**
- `status` - Filter by status (draft, active, completed)
- `page` - Pagination
- `limit` - Results per page

**Response:**
```json
{
  "success": true,
  "tournaments": [],
  "total": 0
}
```

**TODO:**
- Fetch from database
- Add pagination
- Filter by user role

---

#### `GET /api/tournaments/[id]`
Get tournament details.

**Response:**
```json
{
  "success": true,
  "tournament": {
    "id": "tournament_123",
    "name": "Tournament Name",
    "format": "single-elimination",
    "status": "active",
    "maxParticipants": 16,
    "currentParticipants": 8
  }
}
```

**TODO:**
- Fetch from database
- Include participant and match data
- Check user permissions

---

#### `PATCH /api/tournaments/[id]`
Update tournament details.

**Request Body:**
```json
{
  "name": "Updated Tournament Name",
  "description": "New description"
}
```

**TODO:**
- Verify organizer permissions
- Prevent updates after start
- Validate fields

---

#### `DELETE /api/tournaments/[id]`
Delete tournament.

**TODO:**
- Verify organizer permissions
- Notify participants
- Clean up related data

---

### Tournament Actions

#### `POST /api/tournaments/[id]/start`
Start the tournament and generate bracket.

**Response:**
```json
{
  "success": true,
  "tournament": {
    "id": "tournament_123",
    "status": "active",
    "startedAt": "2026-01-17T10:00:00Z"
  },
  "matches": []
}
```

**TODO:**
- Verify minimum participants (2+)
- Generate bracket based on format
- Create initial matches
- Assign seeding
- Notify participants

---

#### `POST /api/tournaments/[id]/join`
Join a tournament using invitation token.

**Request Body:**
```json
{
  "token": "invite_tournament_123_1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "participation": {
    "tournamentId": "tournament_123",
    "userId": "user_456",
    "joinedAt": "2026-01-17T10:00:00Z"
  }
}
```

**TODO:**
- Validate token
- Check tournament capacity
- Verify tournament hasn't started
- Add user to participants

---

#### `POST /api/tournaments/[id]/invite`
Generate invitation token and link.

**Response:**
```json
{
  "success": true,
  "invitation": {
    "token": "invite_tournament_123_1234567890",
    "link": "http://localhost:3000/join/invite_tournament_123_1234567890",
    "expiresAt": "2026-02-16T10:00:00Z"
  }
}
```

**TODO:**
- Verify organizer permissions
- Generate unique token
- Store in database with expiration
- Optional: Email invitations

---

### Matches

#### `GET /api/tournaments/[id]/matches`
Get all matches for a tournament.

**Query Params:**
- `status` - Filter (pending, completed)

**Response:**
```json
{
  "success": true,
  "matches": [
    {
      "id": "match_1",
      "round": 1,
      "matchNumber": 1,
      "player1Id": "user_1",
      "player2Id": "user_2",
      "winnerId": null,
      "status": "pending"
    }
  ],
  "total": 0
}
```

**TODO:**
- Fetch from database
- Include participant details
- Order by round/match number

---

#### `POST /api/tournaments/[id]/matches/[matchId]/result`
Submit match result.

**Request Body:**
```json
{
  "winnerId": "user_1",
  "score": "2-1"
}
```

**Response:**
```json
{
  "success": true,
  "match": {
    "id": "match_1",
    "winnerId": "user_1",
    "score": "2-1",
    "status": "completed"
  },
  "nextMatch": "match_5",
  "tournamentComplete": false
}
```

**TODO:**
- Verify organizer or participant permissions
- Validate winner is a participant
- Update bracket (advance winner)
- Check tournament completion
- Determine champion if complete

---

#### `GET /api/tournaments/[id]/matches/[matchId]/result`
Get match result details.

**TODO:**
- Fetch match from database
- Include participant information

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Authentication:** Clerk
- **Styling:** Tailwind CSS
- **API:** Next.js Route Handlers

## File Structure

```
src/app/
├── (public)/
│   ├── page.tsx                    # Landing page
│   └── join/[token]/page.tsx       # Join tournament
├── (auth)/
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── (protected)/
│   ├── layout.tsx                  # Protected layout with auth check
│   ├── dashboard/page.tsx
│   └── tournaments/
│       ├── create/page.tsx
│       └── [id]/
│           ├── page.tsx            # Tournament overview
│           ├── players/page.tsx
│           ├── matches/page.tsx
│           ├── invite/page.tsx
│           └── settings/page.tsx
├── api/
│   └── tournaments/
│       ├── route.ts                # POST, GET
│       └── [id]/
│           ├── route.ts            # GET, PATCH, DELETE
│           ├── start/route.ts      # POST
│           ├── join/route.ts       # POST
│           ├── invite/route.ts     # POST
│           └── matches/
│               ├── route.ts        # GET
│               └── [matchId]/
│                   └── result/route.ts  # POST, GET
├── layout.tsx                      # Root layout with ClerkProvider
└── globals.css
```

## Key Features

### Authentication
- ✅ Custom sign-in/sign-up UI using Clerk hooks
- ✅ Protected routes with auth middleware
- ✅ User session management

### Route Organization
- ✅ Logical route grouping (public, auth, protected)
- ✅ Clean URL structure
- ✅ Nested layouts for code reuse

### API Design
- ✅ RESTful route handlers
- ✅ Proper HTTP methods (GET, POST, PATCH, DELETE)
- ✅ JSON responses with consistent structure
- ✅ Error handling scaffolding

### Development Ready
- ✅ TypeScript for type safety
- ✅ TODO comments for business logic
- ✅ Placeholder responses for testing
- ✅ No database dependency yet

## Next Steps

### Database Integration
- [ ] Choose database (PostgreSQL, MongoDB, etc.)
- [ ] Set up ORM (Prisma, Drizzle, etc.)
- [ ] Create schema for tournaments, users, matches
- [ ] Implement database queries in API routes

### Business Logic
- [ ] Tournament bracket generation algorithms
- [ ] Match scheduling system
- [ ] User permissions and roles
- [ ] Notification system

### UI Enhancements
- [ ] Tournament bracket visualization
- [ ] Real-time updates (WebSockets/Polling)
- [ ] User profile management
- [ ] Tournament search and discovery

### Additional Features
- [ ] Email notifications
- [ ] QR code generation for invites
- [ ] Tournament statistics and analytics
- [ ] Mobile responsiveness improvements

## Environment Variables

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (when implemented)
DATABASE_URL=
```

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check
```

---

**Status:** ✅ MVP Route Structure Complete - Ready for database and business logic implementation
