import React from 'react';
import { FileSpreadsheet, FileText, MessageSquare, Brain } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab, onTabChange }) => {
  const tabs = [
    { id: 'data-gathering', name: 'Data Gathering', icon: FileSpreadsheet },
    { id: 'documents', name: 'Documents', icon: FileText },
    { id: 'interviews', name: 'Interview Notes', icon: MessageSquare },
    { id: 'ai-analysis', name: 'AI Analysis', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold">Alaska State Departments Analysis Dashboard</h1>
            <p className="text-blue-100 mt-2">Comprehensive analysis platform for state department operations</p>
            {!isSupabaseConfigured() && (
              <div className="mt-3 p-3 bg-yellow-600 rounded-md">
                <p className="text-yellow-100 text-sm">
                  <strong>Database Not Connected:</strong> Please configure your Supabase environment variables to enable data persistence.
                  Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Department Overview */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              'Commerce, Community, & Economic Development',
              'Fish and Game',
              'Natural Resources',
              'Environmental Conservation',
              'Administration - Motor Vehicles'
            ].map((dept, index) => (
              <div key={index} className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-blue-900">{dept}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;