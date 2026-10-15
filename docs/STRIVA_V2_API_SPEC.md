# STRIVA V2 — REST API SPECIFICATION

## 1. GLOBAL API STANDARDS

- **Base Endpoint URL**: `/api/v1`
- **Format**: JSON (`Content-Type: application/json`)
- **Authentication**: `Authorization: Bearer <Supabase_JWT_Token>`
- **Error Format**: All non-2xx responses return a standardized `AppError` JSON body:
  ```json
  {
    "status": "error",
    "statusCode": 401,
    "message": "Invalid or expired token",
    "correlationId": "req_123456789"
  }
  ```

---

## 2. DOMAIN ENDPOINTS INVENTORY

### 2.1 Identity & Profile (`/api/v1/identity`)
- `GET /profile`: Fetch authenticated user profile details.
- `PUT /profile`: Update profile attributes (fitness level, primary goal).
- `GET /goals`: Fetch current active targets (weight, calories, macros).
- `PUT /goals`: Update active targets.

### 2.2 Multi-Tenant Gym Organizations (`/api/v1/organizations`)
- `GET /`: List gym organizations owned by or assigned to authenticated user.
- `POST /`: Create new gym organization (Gym Owner tier required).
- `GET /:id`: Fetch detailed organization profile.
- `GET /:id/members`: List organization members (Gym Manager role required).

### 2.3 Member Directory & Management (`/api/v1/members`)
- `GET /`: Search and list gym members with pagination & filtering.
- `GET /:id`: Fetch member progressive disclosure detail drawer data.
- `PATCH /:id/status`: Update member membership status (Active, Paused, Expired).

### 2.4 Workout Engine (`/api/v1/workouts`)
- `GET /plans`: List member routine plans.
- `POST /plans`: Create new workout routine plan.
- `POST /sessions/start`: Start an active workout session.
- `POST /sets`: Record completed set (weight, reps, rpe).
- `POST /sessions/:id/complete`: Complete workout session & generate volume summary.
- `GET /sessions/current`: Fetch active in-progress workout session.

### 2.5 Nutrition & Hydration (`/api/v1/nutrition`)
- `GET /daily`: Fetch today's calorie, macro, and hydration totals.
- `POST /meals`: Log a meal with calories and macros.
- `POST /water`: Log water intake (`{ "amountMl": 250 }`).

### 2.6 Progress Analytics (`/api/v1/progress`)
- `GET /summary`: Fetch health score, streak, 1RM progression, and weight delta.
- `POST /snapshots`: Log body composition measurement snapshot.
- `GET /benchmarks`: Fetch 1RM strength curves for major compound lifts.

### 2.7 TRINETRA AI Engine (`/api/v1/coach`)
- `POST /chat`: Send user prompt to TRINETRA.
  - Request: `{ "message": "What should I do today?", "conversationId": "optional-uuid" }`
  - Response: `{ "reply": "...", "conversationId": "uuid", "toolExecuted": "get_today_workout" }`
- `GET /history`: Fetch TRINETRA conversation message timeline.

### 2.8 Gym Operations & Attendance (`/api/v1/attendance`)
- `GET /live`: Fetch real-time gym occupancy and total check-ins today.
- `POST /checkin`: Record member QR code or turnstile check-in.

### 2.9 Billing & Subscriptions (`/api/v1/billing`)
- `POST /razorpay/checkout`: Initiate Razorpay subscription order.
  - Request: `{ "tier": "pro", "interval": "monthly" }`
  - Response: `{ "provider": "razorpay", "subscriptionId": "sub_...", "amount": 149900, "keyId": "rzp_live_..." }`
- `POST /razorpay/verify`: Cryptographically verify Razorpay payment HMAC signature.
- `POST /webhook/razorpay`: Razorpay server-to-server event notification webhook.

---

## 3. PROHIBITION OF FRONTEND MOCK FALLBACKS

**STRICT RULE**: Frontend API clients (`httpClient.ts`, `useStrivaApi.ts`) must **NEVER** catch network or HTTP errors and silently return fake JSON data in production. All API failures must propagate clean error notifications to the UI.
