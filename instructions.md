1. Project Identity & Logic Retention
Agency: Prasai.

Domain: stirva.space.

Existing Logic: Do NOT delete or rewrite the existing Supabase database connections or NextAuth Google login flows. Only refactor the UI/UX layer.

Target: Mobile-first PWA for gym members.

2. UI Architecture: Apple-Grade Design
Theme: Modern Dark Mode. Background: #121212. Primary Accent: #00FFC2.

Aesthetic: Glassmorphism. Use backdrop-blur-md, bg-white/5, and border-white/10.

Typography: Priority to SF Pro or a clean Sans-Serif system font. Use variable font weights for hierarchy.

Components:

Corner Radius: 24px for cards and buttons.

Navigation: A fixed Bottom Tab Bar with frosted glass effect.

Heat Map: The "START WORKOUT" button must remain in the lower 40% of the screen.

3. MVP Feature Scope (Refined)
Activity Rings: Implement progress rings based on manual inputs (Calories Burned / Goal) and (Workout Minutes / Goal). Remove automated "Steps" and "Heart Rate" telemetry for now.

The Timer: A functional stopwatch component that begins upon tapping "START WORKOUT" and logs time to the Workouts table in Supabase.

Manual Logging: Create an Apple-style modal for manual entry of Body Weight and Calories Burned.

AI Coach: Use Gemini 1.5 Flash API. Persona: Professional, concise, encouraging. Keep responses under 50 words.

4. Technical Constraints
Hosting: Optimized for Hostinger Node.js Web App plan. Avoid heavy server-side processing; use client-side rendering where possible.

PWA: Ensure manifest.json and service workers are correctly configured for "Add to Home Screen" support.

Compliance: Maintain a minimalist data-usage notice in the footer or onboarding modal to align with Indian DPDP standards.