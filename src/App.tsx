/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PWAPrompt } from './components/PWAPrompt';

// Layout
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages & Modules
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Subscription } from './pages/Subscription';
import { RegisterBusiness } from './pages/RegisterBusiness';
import { Unauthorized } from './pages/Unauthorized';
import { NotFound } from './pages/NotFound';
import { Settings } from './pages/Settings';
import { Products } from './pages/Products';

// Architectural Placeholders (Ready for Sprint 1)
import { POSPlaceholder } from './pages/POSPlaceholder';
import { ReportsPlaceholder } from './pages/ReportsPlaceholder';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <Router>
              <Routes>
                {/* Public Authentication Pages */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Business Registration Wizard (Standalone) */}
                <Route 
                  path="/register-business" 
                  element={
                    <ProtectedRoute allowExpired={true}>
                      <RegisterBusiness />
                    </ProtectedRoute>
                  } 
                />

                {/* Core Protected POS Workspace Console */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  
                  {/* Sprint 1 - Core Features (Locked if Subscription Expires) */}
                  <Route
                    path="products"
                    element={
                      <ProtectedRoute>
                        <Products />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="pos"
                    element={
                      <ProtectedRoute>
                        <POSPlaceholder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="reports"
                    element={
                      <ProtectedRoute allowExpired={true}>
                        <ReportsPlaceholder />
                      </ProtectedRoute>
                    }
                  />

                  {/* Licensing Hub (Always accessible to expired users to support renewal) */}
                  <Route
                    path="subscription"
                    element={
                      <ProtectedRoute allowExpired={true}>
                        <Subscription />
                      </ProtectedRoute>
                    }
                  />

                  {/* Business Configuration Module */}
                  <Route
                    path="business-config"
                    element={
                      <ProtectedRoute allowExpired={true} requiredPermission="settings">
                        <Settings defaultTab="profile" />
                      </ProtectedRoute>
                    }
                  />

                  {/* Settings & Security Module */}
                  <Route
                    path="settings"
                    element={
                      <ProtectedRoute allowExpired={true}>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* 404 Fallback */}
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>

              {/* Install PWA Interactive Prompt Banner */}
              <PWAPrompt />
            </Router>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
