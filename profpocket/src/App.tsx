/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { BottomNav } from './components/common/BottomNav';
import { Toast } from './components/common/Toast';
import { MigrationBanner } from './components/common/MigrationBanner';
import { AuthModal } from './components/auth/AuthModal';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { PurchasesScreen } from './components/purchases/PurchasesScreen';
import { WarrantyTrackerScreen } from './components/warranty/WarrantyTrackerScreen';
import { AnalyticsScreen } from './components/analytics/AnalyticsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { AddPurchaseModal } from './components/purchases/AddPurchaseModal';
import { PurchaseDetailsModal } from './components/purchases/PurchaseDetailsModal';

const AppContent: React.FC = () => {
  const { activeScreen } = useApp();
  const { authLoading } = useAuth();

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'purchases':
        return <PurchasesScreen />;
      case 'warranty':
        return <WarrantyTrackerScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* Toast Alert */}
      <Toast />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 md:pb-8">
          {/* Migration prompt for existing local purchases */}
          <MigrationBanner />

          {renderActiveScreen()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Modals */}
      <AddPurchaseModal />
      <PurchaseDetailsModal />
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
