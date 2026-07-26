import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageLoader } from '../components/PageLoader';
import { ProtectedRoute } from '../components/ProtectedRoute';

import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { PublicLayout } from '../layouts/PublicLayout';

// STRIVA v3 Premium Product Redesign Pages
const V3DashboardPage = lazy(() => import('../v3/pages/V3DashboardPage').then(module => ({ default: module.V3DashboardPage })));
const V3WorkoutPage = lazy(() => import('../v3/pages/V3WorkoutPage').then(module => ({ default: module.V3WorkoutPage })));
const V3CoachPage = lazy(() => import('../v3/pages/V3CoachPage').then(module => ({ default: module.V3CoachPage })));
const V3NutritionPage = lazy(() => import('../v3/pages/V3NutritionPage').then(module => ({ default: module.V3NutritionPage })));
const V3ProgressPage = lazy(() => import('../v3/pages/V3ProgressPage').then(module => ({ default: module.V3ProgressPage })));
const V3BillingPage = lazy(() => import('../v3/pages/V3BillingPage').then(module => ({ default: module.V3BillingPage })));
const V3ProfilePage = lazy(() => import('../v3/pages/V3ProfilePage').then(module => ({ default: module.V3ProfilePage })));

// Legacy & Auth Top-Level Routes
const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AuthCallback = lazy(() => import('../pages/AuthCallback').then(module => ({ default: module.AuthCallback })));
const MembershipRequired = lazy(() => import('../pages/MembershipRequired').then(module => ({ default: module.MembershipRequired })));
const Login = lazy(() => import('../components/Login').then(module => ({ default: module.Login })));
const PricingPage = lazy(() => import('../features/billing/pages/PricingPage').then(module => ({ default: module.PricingPage })));
const CheckoutSuccessPage = lazy(() => import('../features/billing/pages/CheckoutSuccessPage').then(module => ({ default: module.CheckoutSuccessPage })));
const CheckoutCancelPage = lazy(() => import('../features/billing/pages/CheckoutCancelPage').then(module => ({ default: module.CheckoutCancelPage })));

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

        {/* STRIVA v3 PRIMARY PRODUCT ROUTES */}
        <Route path="/v3/dashboard" element={<ProtectedRoute><V3DashboardPage /></ProtectedRoute>} />
        <Route path="/v3/workout" element={<ProtectedRoute><V3WorkoutPage /></ProtectedRoute>} />
        <Route path="/v3/coach" element={<ProtectedRoute><V3CoachPage /></ProtectedRoute>} />
        <Route path="/v3/nutrition" element={<ProtectedRoute><V3NutritionPage /></ProtectedRoute>} />
        <Route path="/v3/progress" element={<ProtectedRoute><V3ProgressPage /></ProtectedRoute>} />
        <Route path="/v3/billing" element={<ProtectedRoute><V3BillingPage /></ProtectedRoute>} />
        <Route path="/v3/profile" element={<ProtectedRoute><V3ProfilePage /></ProtectedRoute>} />

        {/* Supporting Routes */}
        <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
        <Route path="/checkout/success" element={<ProtectedRoute><CheckoutSuccessPage /></ProtectedRoute>} />
        <Route path="/checkout/cancel" element={<ProtectedRoute><CheckoutCancelPage /></ProtectedRoute>} />

        <Route path="/admin/*" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="*" element={<AdminDashboard />} />
        </Route>

        {/* Default Route Pointer to v3 Engine */}
        <Route path="/dashboard" element={<Navigate to="/v3/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/v3/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};
