import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import MainLayout from '@layouts/MainLayout.jsx';
import AuthLayout from '@layouts/AuthLayout.jsx';

import { ProtectedRoute, PublicRoute } from './GuardedRoute.jsx';

import HomePage from '@pages/Home.jsx';
import DashboardPage from '@pages/Dashboard.jsx';
import NotFoundPage from '@pages/NotFound.jsx';
import LoginPage from '@pages/Login.jsx';
import RegisterPage from '@pages/Register.jsx';
import NotesPage from '@pages/Notes.jsx';
import ResourcesPage from '@pages/Resources.jsx';
import SettingsPage from '@pages/Settings.jsx';
import HelpSupportPage from '@pages/HelpSupport.jsx';
import ChapterExplainerPage from '@pages/ChapterExplainer.jsx';
import MockTestsPage from '@pages/MockTests.jsx';
import MockTestDetailsPage from '@pages/MockTestDetails.jsx';
import MockAttemptPage from '@pages/MockAttempt.jsx';
import MockResultPage from '@pages/MockResult.jsx';
import FormulaBookPage from '@pages/FormulaBook.jsx';
import GovtJobsRedirect from '@pages/GovtJobsRedirect.jsx';
import SubscriptionPage from '@pages/Subscription.jsx';
import PremiumGate from '../components/subscription/PremiumGate.jsx';
import AdminLayout from '@layouts/AdminLayout.jsx';
import AdminDashboard from '@pages/admin/AdminDashboard.jsx';
import AdminUsers from '@pages/admin/AdminUsers.jsx';
import AdminSubscriptions from '@pages/admin/AdminSubscriptions.jsx';
import AdminAnalytics from '@pages/admin/AdminAnalytics.jsx';
import AdminAuditLogs from '@pages/admin/AdminAuditLogs.jsx';

export const publicRoutes = [
  {
    path: '/login',
    element: (
      <PublicRoute>
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
];

export const protectedRoutes = [
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '', element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'help', element: <HelpSupportPage /> },
      { path: 'ai/chapter-explainer', element: <PremiumGate feature="ai_explainer"><ChapterExplainerPage /></PremiumGate> },
      { path: 'mock-tests', element: <PremiumGate feature="mock_tests"><MockTestsPage /></PremiumGate> },
      { path: 'mock-tests/:id', element: <PremiumGate feature="mock_tests"><MockTestDetailsPage /></PremiumGate> },
      { path: 'mock-tests/:id/attempt', element: <PremiumGate feature="mock_tests"><MockAttemptPage /></PremiumGate> },
      { path: 'mock-tests/attempts/:attemptId', element: <PremiumGate feature="mock_tests"><MockResultPage /></PremiumGate> },
      { path: 'formula-book', element: <FormulaBookPage /> },
      { path: 'govt-jobs', element: <GovtJobsRedirect /> },
      { path: 'subscription', element: <SubscriptionPage /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '', element: <AdminDashboard /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'subscriptions', element: <AdminSubscriptions /> },
      { path: 'analytics', element: <AdminAnalytics /> },
      { path: 'audit-logs', element: <AdminAuditLogs /> },
    ],
  },
];

export const commonRoutes = [
  { path: '/', element: <HomePage /> },
  { path: '*', element: <NotFoundPage /> },
];

const router = createBrowserRouter([...publicRoutes, ...protectedRoutes, ...commonRoutes]);

export default router;
