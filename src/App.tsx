import React, { useState } from 'react';
import DashboardLayout from './components/DashboardLayout';
import DataGathering from './components/DataGathering';
import Documents from './components/Documents';
import InterviewNotes from './components/InterviewNotes';
import AIAnalysis from './components/AIAnalysis';

function App() {
  const [activeTab, setActiveTab] = useState('data-gathering');
  const [dashboardData, setDashboardData] = useState({
    interviews: [],
    documents: [],
    inventory: []
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'data-gathering':
        return <DataGathering />;
      case 'documents':
        return <Documents />;
      case 'interviews':
        return <InterviewNotes />;
      case 'ai-analysis':
        return <AIAnalysis data={dashboardData} />;
      default:
        return <DataGathering />;
    }
  };

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
}

export default App;