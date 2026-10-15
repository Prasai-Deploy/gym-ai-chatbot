import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import request from 'supertest';
import { app } from '../../src/app/app';

describe('STRIVA V2 Phase 14A — Public Landing Page, Routing & Health Verification', () => {
  const landingPagePath = path.resolve(__dirname, '../../../src/pages/LandingPage.tsx');
  const routerPath = path.resolve(__dirname, '../../../src/router/index.tsx');
  const protectedRoutePath = path.resolve(__dirname, '../../../src/components/ProtectedRoute.tsx');
  const loginPath = path.resolve(__dirname, '../../../src/components/Login.tsx');
  const pricingPagePath = path.resolve(__dirname, '../../../src/features/billing/pages/PricingPage.tsx');

  // ==========================================================================
  // PART 1: Backend Health Endpoints (/health and /api/v1/health)
  // ==========================================================================
  describe('Part 1: Health Endpoints', () => {
    it('TEST 1: GET /health returns 200 with status OK', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.timestamp).toBeDefined();
    });

    it('TEST 2: GET /api/v1/health returns 200 with status OK (REST API versioned)', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ==========================================================================
  // PART 2: Router Configuration & Public/Protected Boundary Invariants
  // ==========================================================================
  describe('Part 2: Router Configuration Invariants', () => {
    const routerContent = fs.readFileSync(routerPath, 'utf-8');

    it('TEST 3: Root path / is explicitly mapped to LandingPage under PublicLayout', () => {
      expect(routerContent).toContain('<Route path="/" element={<LandingPage />} />');
      const publicLayoutIndex = routerContent.indexOf('<Route element={<PublicLayout />}>');
      const landingRouteIndex = routerContent.indexOf('<Route path="/" element={<LandingPage />} />');
      expect(publicLayoutIndex).toBeGreaterThan(0);
      expect(landingRouteIndex).toBeGreaterThan(publicLayoutIndex);
    });

    it('TEST 4: Pricing page is publicly accessible without forced login redirection', () => {
      const publicLayoutIndex = routerContent.indexOf('<Route element={<PublicLayout />}>');
      const pricingRouteIndex = routerContent.indexOf('<Route path="/pricing" element={<PricingPage />} />');
      expect(pricingRouteIndex).toBeGreaterThan(publicLayoutIndex);
      // Confirm /pricing is NOT inside ProtectedRoute in router
      expect(routerContent).not.toContain('<ProtectedRoute><PricingPage /></ProtectedRoute>');
    });

    it('TEST 5: Catch-all unknown routes redirect to public root /', () => {
      expect(routerContent).toContain('<Route path="*" element={<Navigate to="/" replace />} />');
    });

    it('TEST 6: Protected Member & Owner routes remain strictly enclosed in ProtectedRoute', () => {
      expect(routerContent).toContain('<Route element={<ProtectedRoute><MemberLayout /></ProtectedRoute>}>');
      expect(routerContent).toContain('<Route path="/owner" element={<ProtectedRoute><OwnerLayout /></ProtectedRoute>}>');
    });
  });

  // ==========================================================================
  // PART 3: ProtectedRoute & Login Redirect Destination Invariants
  // ==========================================================================
  describe('Part 3: Redirect-Back and Return URL Preservation', () => {
    const protectedRouteContent = fs.readFileSync(protectedRoutePath, 'utf-8');
    const loginContent = fs.readFileSync(loginPath, 'utf-8');

    it('TEST 7: ProtectedRoute preserves originating location state when redirecting to /login', () => {
      expect(protectedRouteContent).toContain('useLocation');
      expect(protectedRouteContent).toContain('<Navigate to="/login" state={{ from: location }} replace />');
    });

    it('TEST 8: Login component extracts from destination and navigates to target after authentication', () => {
      expect(loginContent).toContain('useLocation');
      expect(loginContent).toContain("const from = (location.state as any)?.from?.pathname || '/v3/dashboard';");
      expect(loginContent).toContain('<Navigate to={from} replace />');
      expect(loginContent).toContain('navigate(from, { replace: true });');
    });

    it('TEST 9: Login component provides a clear Back to STRIVA Home link', () => {
      expect(loginContent).toContain('Back to STRIVA Home');
      expect(loginContent).toContain('to="/"');
    });
  });

  // ==========================================================================
  // PART 4: PricingPage Public-Visit Safety
  // ==========================================================================
  describe('Part 4: PricingPage Public Interaction Safety', () => {
    const pricingContent = fs.readFileSync(pricingPagePath, 'utf-8');

    it('TEST 10: Unauthenticated users attempting checkout are safely routed to /login preserving /pricing destination', () => {
      expect(pricingContent).toContain('useAuth');
      expect(pricingContent).toContain("if (!user) {");
      expect(pricingContent).toContain("navigate('/login', { state: { from: { pathname: '/pricing' } } });");
    });

    it('TEST 11: Navigation dynamically displays Back to Home for public visitors vs Back to Billing for members', () => {
      expect(pricingContent).toContain("user ? 'Back to Billing' : 'Back to Home'");
    });
  });

  // ==========================================================================
  // PART 5: LandingPage Content, Design System Tokens & Section Invariants
  // ==========================================================================
  describe('Part 5: LandingPage Specification & Structure Audit', () => {
    const landingContent = fs.readFileSync(landingPagePath, 'utf-8');

    it('TEST 12: Hero section incorporates approved core headline and copy', () => {
      expect(landingContent).toContain('Train with purpose.');
      expect(landingContent).toContain('Progress with intelligence.');
      expect(landingContent).toContain('Plan workouts, track nutrition, understand your progress, and get personalized guidance with STRIVA.');
    });

    it('TEST 13: Navigation bar includes STRIVA branding and smooth navigation links', () => {
      expect(landingContent).toContain('STRIVA');
      expect(landingContent).toContain('Capabilities');
      expect(landingContent).toContain('Product Preview');
      expect(landingContent).toContain('How It Works');
      expect(landingContent).toContain('Pricing');
      expect(landingContent).toContain('FAQ');
    });

    it('TEST 14: Authenticated user gets Continue/Go to Dashboard button instead of Sign In', () => {
      expect(landingContent).toContain("user ? 'Continue to Dashboard' : 'Get started'");
      expect(landingContent).toContain('Go to Dashboard');
    });

    it('TEST 15: All 5 product capability pillars are present with detailed technical copy', () => {
      expect(landingContent).toContain('Precision Workout Execution');
      expect(landingContent).toContain('Structured Training Programs');
      expect(landingContent).toContain('Nutrition & Macro Balance');
      expect(landingContent).toContain('Longitudinal Progress Telemetry');
      expect(landingContent).toContain('TRINETRA AI Guidance Layer');
    });

    it('TEST 16: Interactive Product Preview includes genuine UI preview tabs without fake metrics', () => {
      expect(landingContent).toContain('TRINETRA AI Coach');
      expect(landingContent).toContain('Active Workout Session');
      expect(landingContent).toContain('Nutrition & Hydration');
      expect(landingContent).toContain('Progress Analytics');
      expect(landingContent).toContain('Genuine UI Preview');
    });

    it('TEST 17: How It Works section outlines the 3-step athletic workflow', () => {
      expect(landingContent).toContain('Set Targets & Baseline');
      expect(landingContent).toContain('Execute & Log Precision Sets');
      expect(landingContent).toContain('Progress with TRINETRA AI');
    });

    it('TEST 18: Pricing section strictly displays verified pricing (₹799/mo and ₹6,999/yr with ~27% savings)', () => {
      expect(landingContent).toContain('₹799');
      expect(landingContent).toContain('₹6,999');
      expect(landingContent).toContain('Save ~27%');
      expect(landingContent).toContain('14-Day Free Trial');
    });

    it('TEST 19: FAQ section contains answers on TRINETRA AI, trial, mobile support, and data privacy', () => {
      expect(landingContent).toContain('What is STRIVA');
      expect(landingContent).toContain('TRINETRA AI Coach');
      expect(landingContent).toContain('14-day free trial');
      expect(landingContent).toContain('mobile devices');
      expect(landingContent).toContain('Row Level Security');
    });

    it('TEST 20: Accessible touch target sizes (>=44px) and focus indicators are enforced', () => {
      expect(landingContent).toContain('min-h-[44px]');
      expect(landingContent).toContain('focus-visible:ring');
      expect(landingContent).toContain('#050608'); // Dark void background
      expect(landingContent).toContain('#84CC16'); // Restrained athletic lime
    });
  });
});
