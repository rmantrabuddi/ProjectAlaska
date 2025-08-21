import React, { useState } from 'react';
import { FileText, MessageSquare, StickyNote, Users, BarChart3, Search, Calendar, Building, ChevronRight, MapPin, HelpCircle } from 'lucide-react';
import ContentInput from './components/ContentInput';
import ContentManagement from './components/ContentManagement';
import AnalysisDashboard from './components/AnalysisDashboard';
import StateOverview from './components/StateOverview';
import InventoryMaster from './components/InventoryMaster';
import { ContentItem, Department } from './types';

const DEPARTMENTS: Department[] = [
  { 
    id: 1, 
    name: 'Department of Fish and Game', 
    shortName: 'Fish & Game',
    description: 'Manages Alaska\'s fish and wildlife resources for sustained yield and public benefit',
    keyQuestions: [
      'How effective are current wildlife management strategies in balancing conservation with public access?',
      'What are the primary challenges in fish stock assessment and monitoring across Alaska\'s vast territory?',
      'How well do current licensing and permit systems serve both residents and non-residents?',
      'What role does climate change play in wildlife population dynamics and habitat management?',
      'How effective is coordination between federal, state, and local agencies in resource management?',
      'What are the key enforcement challenges and how might technology improve compliance monitoring?',
      'How do subsistence rights and commercial interests balance in current management practices?'
    ]
  },
  { 
    id: 2, 
    name: 'Department of Natural Resources', 
    shortName: 'Natural Resources',
    description: 'Develops Alaska\'s natural resources while protecting the environment and maximizing benefits for Alaskans',
    keyQuestions: [
      'How effectively does the permitting process balance development speed with environmental protection?',
      'What are the primary bottlenecks in oil and gas lease administration and approval processes?',
      'How well do current mining regulations protect both industry interests and environmental concerns?',
      'What role should renewable energy development play in Alaska\'s energy portfolio?',
      'How effective are current land use planning processes in managing competing interests?',
      'What are the key challenges in managing state lands for multiple uses (recreation, development, conservation)?',
      'How can technology improve resource monitoring and regulatory compliance?',
      'What coordination improvements are needed between state and federal land management agencies?'
    ]
  },
  { 
    id: 3, 
    name: 'Department of Environmental Conservation', 
    shortName: 'Environmental',
    description: 'Protects and enhances Alaska\'s environment and public health',
    keyQuestions: [
      'How effectively do current air quality monitoring systems protect public health across Alaska\'s diverse geography?',
      'What are the primary challenges in water quality protection, especially in remote communities?',
      'How well do waste management systems serve both urban and rural Alaska communities?',
      'What improvements are needed in environmental cleanup and remediation processes?',
      'How effective are current pollution prevention and control measures?',
      'What role should the department play in climate change adaptation and mitigation?',
      'How can environmental justice concerns be better integrated into departmental decision-making?',
      'What coordination improvements are needed with federal environmental agencies?'
    ]
  },
  { 
    id: 4, 
    name: 'Department of Commerce, Community, and Economic Development', 
    shortName: 'Commerce',
    description: 'Promotes economic development and supports Alaska\'s communities and businesses',
    keyQuestions: [
      'How effectively do current economic development programs support business growth across Alaska?',
      'What are the primary barriers to small business development in rural and urban Alaska?',
      'How well do community development programs address the unique needs of Alaska\'s diverse communities?',
      'What role should the state play in supporting emerging industries and innovation?',
      'How effective are current workforce development and training programs?',
      'What improvements are needed in business licensing and regulatory processes?',
      'How can the department better support tourism development while managing environmental impacts?',
      'What coordination is needed between state and local economic development efforts?'
    ]
  },
  { 
    id: 5, 
    name: 'Department of Administration – Division of Motor Vehicles', 
    shortName: 'DMV',
    description: 'Provides motor vehicle services including licensing, registration, and safety oversight',
    keyQuestions: [
      'How effectively do current DMV services meet the needs of Alaska residents across the state\'s geography?',
      'What are the primary challenges in vehicle registration and licensing processes?',
      'How well do current systems handle the unique needs of rural and remote communities?',
      'What improvements are needed in driver testing and licensing procedures?',
      'How effective are current vehicle safety inspection and enforcement programs?',
      'What role should technology play in modernizing DMV services and reducing wait times?',
      'How can the division better coordinate with law enforcement and other agencies?',
      'What are the key challenges in maintaining accurate vehicle and driver records?'
    ]
  }
];

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'input' | 'manage' | 'analyze'>('overview');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);

  const addContentItem = (item: Omit<ContentItem, 'id' | 'createdAt'>) => {
    const newItem: ContentItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setContentItems(prev => [...prev, newItem]);
  };

  const removeContentItem = (id: string) => {
    setContentItems(prev => prev.filter(item => item.id !== id));
  };

  const handleDepartmentSelect = (departmentId: number) => {
    setSelectedDepartmentId(departmentId);
    setActiveTab('input');
  };

  const handleBackToOverview = () => {
    setSelectedDepartmentId(null);
    setActiveTab('overview');
  };
  const tabs = [
    { id: 'overview', label: 'State Overview', icon: MapPin },
    { id: 'inventory', label: 'Inventory Master', icon: FileText },
    { id: 'input', label: 'Content Input', icon: FileText },
    { id: 'manage', label: 'Content Management', icon: Users },
    { id: 'analyze', label: 'Analysis Dashboard', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-400 text-slate-800 p-2 rounded-lg">
                <Building className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Alaska State Consulting Platform</h1>
                <p className="text-slate-300 text-sm">Strategic Analysis & Insights Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-4 font-medium text-sm border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-700 bg-blue-50'
                      : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <StateOverview 
            departments={DEPARTMENTS} 
            contentItems={contentItems} 
            onDepartmentSelect={handleDepartmentSelect}
          />
        )}
        {activeTab === 'inventory' && (
          <InventoryMaster />
        )}
        {activeTab === 'input' && (
          <ContentInput 
            departments={DEPARTMENTS} 
            onAddContent={addContentItem}
            selectedDepartmentId={selectedDepartmentId}
            onBackToOverview={handleBackToOverview}
          />
        )}
        {activeTab === 'manage' && (
          <ContentManagement 
            contentItems={contentItems} 
            departments={DEPARTMENTS}
            onRemoveContent={removeContentItem}
          />
        )}
        {activeTab === 'analyze' && (
          <AnalysisDashboard 
            contentItems={contentItems} 
            departments={DEPARTMENTS}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-6 mt-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm">
            © 2025 State of Alaska Consulting Platform - Confidential & Proprietary
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;