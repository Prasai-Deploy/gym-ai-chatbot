import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageLoader } from '../components/PageLoader';
import { ProtectedRoute } from '../components/ProtectedRoute';

import { DashboardLayout } from '../layouts/DashboardLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { PublicLayout } from '../layouts/PublicLayout';

// Lazy loaded top-level routes for performance optimization
const Dashboard = lazy(() => import('../features/dashboard/pages/DashboardPage').then(module => ({ default: module.default })));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const AuthCallback = lazy(() => import('../pages/AuthCallback').then(module => ({ default: module.AuthCallback })));
const MembershipRequired = lazy(() => import('../pages/MembershipRequired').then(module => ({ default: module.MembershipRequired })));
const Login = lazy(() => import('../components/Login').then(module => ({ default: module.Login })));

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

        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
        </Route>

        <Route path="/admin/*" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route path="*" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};
