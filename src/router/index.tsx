import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageLoader } from '../components/PageLoader';
import { ProtectedRoute } from '../components/ProtectedRoute';

import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { PublicLayout } from '../layouts/PublicLayout';
import { MemberLayout } from '../layouts/MemberLayout';

// STRIVA v3 Premium Member Product Pages
const V3DashboardPage = lazy(() => import('../v3/pages/V3DashboardPage').then(module => ({ default: module.V3DashboardPage })));
const V3WorkoutPage = lazy(() => import('../v3/pages/V3WorkoutPage').then(module => ({ default: module.V3WorkoutPage })));
const V3CoachPage = lazy(() => import('../v3/pages/V3CoachPage').then(module => ({ default: module.V3CoachPage })));
const V3NutritionPage = lazy(() => import('../v3/pages/V3NutritionPage').then(module => ({ default: module.V3NutritionPage })));
const V3ProgressPage = lazy(() => import('../v3/pages/V3ProgressPage').then(module => ({ default: module.V3ProgressPage })));
const V3BillingPage = lazy(() => import('../v3/pages/V3BillingPage').then(module => ({ default: module.V3BillingPage })));
const V3ProfilePage = lazy(() => import('../v3/pages/V3ProfilePage').then(module => ({ default: module.V3ProfilePage })));
const V3NotFoundPage = lazy(() => import('../v3/pages/V3NotFoundPage').then(module => ({ default: module.V3NotFoundPage })));

// Legacy & Auth Top-Level Routes
const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AuthCallback = lazy(() => import('../pages/AuthCallback').then(module => ({ default: module.AuthCallback })));
const MembershipRequired = lazy(() => import('../pages/MembershipRequired').then(module => ({ default: module.MembershipRequired })));
const Login = lazy(() => import('../components/Login').then(module => ({ default: module.Login })));
const PricingPage = lazy(() => import('../features/billing/pages/PricingPage').then(module => ({ default: module.PricingPage })));
const CheckoutSuccessPage = lazy(() => import('../features/billing/pages/CheckoutSuccessPage').then(module => ({ default: module.CheckoutSuccessPage })));
const CheckoutCancelPage = lazy(() => import('../features/billing/pages/CheckoutCancelPage').then(module => ({ default: module.CheckoutCancelPage })));

// STRIVA V2 Gym Owner OS Pages
const OwnerLayout = lazy(() => import('../features/owner/layout/OwnerLayout').then(module => ({ default: module.OwnerLayout })));
const OwnerDashboardPage = lazy(() => import('../features/owner/pages/OwnerDashboardPage').then(module => ({ default: module.OwnerDashboardPage })));
const OwnerMembersPage = lazy(() => import('../features/owner/pages/OwnerMembersPage').then(module => ({ default: module.OwnerMembersPage })));
const OwnerAttendancePage = lazy(() => import('../features/owner/pages/OwnerAttendancePage').then(module => ({ default: module.OwnerAttendancePage })));
const OwnerTrainersPage = lazy(() => import('../features/owner/pages/OwnerTrainersPage').then(module => ({ default: module.OwnerTrainersPage })));
const OwnerAnalyticsPage = lazy(() => import('../features/owner/pages/OwnerAnalyticsPage').then(module => ({ default: module.OwnerAnalyticsPage })));
const OwnerBillingPage = lazy(() => import('../features/owner/pages/OwnerBillingPage').then(module => ({ default: module.OwnerBillingPage })));
const OwnerAdvisorPage = lazy(() => import('../features/owner/pages/OwnerAdvisorPage').then(module => ({ default: module.OwnerAdvisorPage })));

export const AppRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/membership-required" element={<MembershipRequired />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* STRIVA V2 CANONICAL MEMBER PRODUCT ROUTES */}
        <Route element={<ProtectedRoute><MemberLayout /></ProtectedRoute>}>
          <Route path="/v3/dashboard" element={<V3DashboardPage />} />
          <Route path="/v3/coach" element={<V3CoachPage />} />
          <Route path="/v3/workout" element={<V3WorkoutPage />} />
          <Route path="/v3/nutrition" element={<V3NutritionPage />} />
          <Route path="/v3/progress" element={<V3ProgressPage />} />
          <Route path="/v3/profile" element={<V3ProfilePage />} />
          <Route path="/v3/billing" element={<V3BillingPage />} />
          <Route path="/v3/*" element={<V3NotFoundPage />} />
        </Route>

        {/* Supporting Billing Routes */}
        <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
        <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccessPage /></ProtectedRoute>} />
        <Route path="/checkout/cancel" element={<ProtectedRoute><CheckoutCancelPage /></ProtectedRoute>} />

        {/* STRIVA V2 CANONICAL GYM OWNER OS ROUTES */}
        <Route path="/owner" element={<ProtectedRoute><OwnerLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/owner/dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboardPage />} />
          <Route path="advisor" element={<OwnerAdvisorPage />} />
          <Route path="members" element={<OwnerMembersPage />} />
          <Route path="attendance" element={<OwnerAttendancePage />} />
          <Route path="trainers" element={<OwnerTrainersPage />} />
          <Route path="analytics" element={<OwnerAnalyticsPage />} />
          <Route path="billing" element={<OwnerBillingPage />} />
          <Route path="*" element={<Navigate to="/owner/dashboard" replace />} />
        </Route>

        {/* Legacy owner route redirects to canonical /owner/* */}
        <Route path="/v3/advisor" element={<Navigate to="/owner/advisor" replace />} />
        <Route path="/admin/advisor" element={<Navigate to="/owner/advisor" replace />} />
        <Route path="/v3/members" element={<Navigate to="/owner/members" replace />} />
        <Route path="/admin/members" element={<Navigate to="/owner/members" replace />} />
        <Route path="/v3/attendance" element={<Navigate to="/owner/attendance" replace />} />
        <Route path="/admin/attendance" element={<Navigate to="/owner/attendance" replace />} />
        <Route path="/v3/trainers" element={<Navigate to="/owner/trainers" replace />} />
        <Route path="/admin/trainers" element={<Navigate to="/owner/trainers" replace />} />
        <Route path="/v3/analytics" element={<Navigate to="/owner/analytics" replace />} />
        <Route path="/admin/analytics" element={<Navigate to="/owner/analytics" replace />} />
        <Route path="/v3/owner/billing" element={<Navigate to="/owner/billing" replace />} />
        <Route path="/admin/billing" element={<Navigate to="/owner/billing" replace />} />

        <Route path="/admin/*" element={
          <ProtectedRoute>
            <OwnerLayout />
          </ProtectedRoute>
        }>
          <Route path="*" element={<OwnerDashboardPage />} />
        </Route>

        {/* Default Route Pointer to Canonical Home */}
        <Route path="/dashboard" element={<Navigate to="/v3/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/v3/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};
