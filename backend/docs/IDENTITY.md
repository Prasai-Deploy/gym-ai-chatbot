# STRIVA v2: Identity Domain

## Overview
The Identity Domain is the central source of truth for user accounts in STRIVA. 

## Tables
- `profiles`: The core user profile (1:1 with `auth.users`).
- `fitness_profiles`: Biological and objective-based data.
- `user_preferences`: Notification and system unit settings.
- `member_settings`: Application UI settings (theme, etc).

## REST Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/identity/profile` | Gets the current user profile. |
| PATCH | `/api/v1/identity/profile` | Updates the current user profile. |
| GET | `/api/v1/identity/profile/fitness` | Gets the fitness profile. |
| PATCH | `/api/v1/identity/profile/fitness` | Updates the fitness profile. |
| GET | `/api/v1/identity/profile/preferences` | Gets preferences. |
| PATCH | `/api/v1/identity/profile/preferences` | Updates preferences. |
| GET | `/api/v1/identity/me` | Fetches a composite object of all identity data. |

## Domain Events
This domain publishes the following events for downstream processing:
- `ProfileCreated`
- `ProfileUpdated`
- `FitnessProfileUpdated`
- `PreferencesUpdated`

## Security
- Fully guarded by Supabase Row Level Security (RLS) ensuring a user can only query their own profiles (where `auth.uid() = id`).
- REST endpoints are guarded by the `requireAuth` Express middleware validating Bearer Tokens.
