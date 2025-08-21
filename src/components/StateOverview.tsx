import React, { useState } from 'react';
import { Building, Users, FileText, MessageSquare, StickyNote, ChevronRight, HelpCircle, BarChart3, Calendar, Target, Zap, Key, Upload, ExternalLink, Search, Filter, Edit2, Save, X, AlertTriangle, TrendingUp, Clock, PieChart } from 'lucide-react';
import { Department, ContentItem, LicensePermitData } from '../types';
import { checkAPIKey } from '../services/openai';
import { inventoryService } from '../services/supabase';

interface StateOverviewProps {
  departments: Department[];
  contentItems: ContentItem[];
  onDepartmentSelect: (departmentId: number) => void;
}

const StateOverview: React.FC<StateOverviewProps> = ({ departments, contentItems, onDepartmentSelect }) => {
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showDataTable, setShowDataTable] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [divisionFilter, setDivisionFilter] = useState<string>('');
  const [titleFilter, setTitleFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<LicensePermitData>>({});
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [typesCountData, setTypesCountData] = useState<any>(null);
  const [processingTimeData, setProcessingTimeData] = useState<any[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(2024);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Mock data - in real app this would come from uploaded file or API
  const [licenseData, setLicenseData] = useState<LicensePermitData[]>([
    {
      id: '1',
      department: 'Department of Fish and Game',
      division: 'Wildlife Conservation',
      licensePermitTitle: 'Hunting License',
      approvingEntity: 'ADF&G Licensing Division',
      description: 'Annual hunting license for residents',
      processingTime: '1-2 business days',
      fee: '$25.00',
      renewalPeriod: 'Annual',
      requirements: 'Hunter safety course completion',
      status: 'Active',
      lastUpdated: new Date('2024-01-15')
    },
    {
      id: '2',
      department: 'Department of Natural Resources',
      division: 'Oil and Gas',
      licensePermitTitle: 'Oil and Gas Lease',
      approvingEntity: 'DNR Commissioner',
      description: 'Lease for oil and gas exploration',
      processingTime: '60-90 days',
      fee: '$500.00',
      renewalPeriod: '10 years',
      requirements: 'Environmental impact assessment',
      status: 'Active',
      lastUpdated: new Date('2024-01-10')
    },
    {
      id: '3',
      department: 'Department of Environmental Conservation',
      division: 'Water Quality',
      licensePermitTitle: 'Water Discharge Permit',
      approvingEntity: 'DEC Water Division',
      description: 'Permit for industrial water discharge',
      processingTime: '30-45 days',
      fee: '$150.00',
      renewalPeriod: '5 years',
      requirements: 'Water quality monitoring plan',
      status: 'Active',
      lastUpdated: new Date('2024-01-20')
    },
    {
      id: '4',
      department: 'Department of Commerce, Community, and Economic Development',
      division: 'Business Licensing',
      licensePermitTitle: 'Business License',
      approvingEntity: 'DCCED Business Division',
      description: 'General business operating license',
      processingTime: '5-7 business days',
      fee: '$50.00',
      renewalPeriod: '2 years',
      requirements: 'Business registration documents',
      status: 'Active',
      lastUpdated: new Date('2024-01-12')
    },
    {
      id: '5',
      department: 'Department of Administration – Division of Motor Vehicles',
      division: 'Vehicle Services',
      licensePermitTitle: 'Driver License',
      approvingEntity: 'DMV Licensing Office',
      description: 'Standard driver license',
      processingTime: 'Same day',
      fee: '$20.00',
      renewalPeriod: '5 years',
      requirements: 'Vision test, written test, road test',
      status: 'Active',
      lastUpdated: new Date('2024-01-18')
    }
  ]);

  const hasAPIKey = checkAPIKey();

  // Load analytics data
  const loadAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      const [analytics, typesCount, processingTime] = await Promise.all([
        inventoryService.getAnalytics(selectedFiscalYear),
        inventoryService.getTypesCountByDepartment(selectedFiscalYear),
        inventoryService.getProcessingTimeByDepartment()
      ]);
      
      setAnalyticsData(analytics);
      setTypesCountData(typesCount);
      setProcessingTimeData(processingTime);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  React.useEffect(() => {
    loadAnalyticsData();
  }, [selectedFiscalYear]);

  const getDepartmentStats = (departmentId: number) => {
    const items = contentItems.filter(item => item.departmentId === departmentId);
    return {
      total: items.length,
      interviews: items.filter(item => item.type === 'interview').length,
      documents: items.filter(item => item.type === 'document').length,
      notes: items.filter(item => item.type === 'note').length,
      interviewItems: items.filter(item => item.type === 'interview'),
      documentItems: items.filter(item => item.type === 'document'),
      noteItems: items.filter(item => item.type === 'note')
    };
  };

  const totalStats = {
    departments: departments.length,
    interviews: contentItems.filter(item => item.type === 'interview').length,
    documents: contentItems.filter(item => item.type === 'document').length,
    notes: contentItems.filter(item => item.type === 'note').length
  };

  // Calculate license/permit statistics
  const licenseStats = {
    totalLicenses: licenseData.length,
    byDepartment: licenseData.reduce((acc, item) => {
      const deptKey = item.department.split(' – ')[0];
      acc[deptKey] = (acc[deptKey] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number }),
    accessPercentage: {
      'Active': Math.round((licenseData.filter(item => item.status === 'Active').length / licenseData.length) * 100),
      'Inactive': Math.round((licenseData.filter(item => item.status === 'Inactive').length / licenseData.length) * 100),
      'Under Review': Math.round((licenseData.filter(item => item.status === 'Under Review').length / licenseData.length) * 100)
    },
    processingRanges: {
      'Same Day': licenseData.filter(item => item.processingTime.toLowerCase().includes('same day')).length,
      '1-7 Days': licenseData.filter(item => 
        item.processingTime.toLowerCase().includes('business days') || 
        item.processingTime.toLowerCase().includes('1-2') ||
        item.processingTime.toLowerCase().includes('5-7')
      ).length,
      '30-45 Days': licenseData.filter(item => 
        item.processingTime.toLowerCase().includes('30-45')
      ).length,
      '60+ Days': licenseData.filter(item => 
        item.processingTime.toLowerCase().includes('60-90') ||
        item.processingTime.toLowerCase().includes('90')
      ).length
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setUploadStatus(`Uploaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      setShowDataTable(true);
      // Here you would typically process the file
      // For now, we'll just store it in state
    }
  };

  const openDepartmentTab = (departmentId: number) => {
    // For now, we'll use the existing onDepartmentSelect function
    // In a real application, this would open a new tab/window
    onDepartmentSelect(departmentId);
  };

  // Filter data based on search and filter criteria
  const filteredData = licenseData.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.licensePermitTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === '' || item.department === departmentFilter;
    const matchesDivision = divisionFilter === '' || item.division === divisionFilter;
    const matchesTitle = titleFilter === '' || item.licensePermitTitle.toLowerCase().includes(titleFilter.toLowerCase());
    const matchesEntity = entityFilter === '' || item.approvingEntity === entityFilter;
    
    return matchesSearch && matchesDepartment && matchesDivision && matchesTitle && matchesEntity;
  });

  // Get unique values for filter dropdowns
  const uniqueDepartments = [...new Set(licenseData.map(item => item.department))];
  const uniqueDivisions = [...new Set(licenseData.map(item => item.division))];
  const uniqueEntities = [...new Set(licenseData.map(item => item.approvingEntity))];

  const handleEdit = (item: LicensePermitData) => {
    setEditingRow(item.id);
    setEditData(item);
  };

  const handleSave = () => {
    if (editingRow && editData) {
      setLicenseData(prev => prev.map(item => 
        item.id === editingRow ? { ...item, ...editData, lastUpdated: new Date() } : item
      ));
      setEditingRow(null);
      setEditData({});
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditData({});
  };

  // Calculate analytics from data
  const calculateChannelStats = () => {
    if (!analyticsData) return { Manual: 0, Online: 0, Both: 0, Unknown: 0 };
    
    return analyticsData.reduce((acc: any, item: any) => {
      const channel = item.access_channel || 'Unknown';
      const applications = item[`applications_processed_${selectedFiscalYear}`] || 0;
      acc[channel] = (acc[channel] || 0) + applications;
      return acc;
    }, { Manual: 0, Online: 0, Both: 0, Unknown: 0 });
  };

  const calculateDepartmentApplications = () => {
    if (!analyticsData) return {};
    
    return analyticsData.reduce((acc: any, item: any) => {
      const dept = item.department || 'Unknown';
      const applications = item[`applications_processed_${selectedFiscalYear}`] || 0;
      acc[dept] = (acc[dept] || 0) + applications;
      return acc;
    }, {});
  };

  const calculateDepartmentRevenue = () => {
    if (!analyticsData) return {};
    
    return analyticsData.reduce((acc: any, item: any) => {
      const dept = item.department || 'Unknown';
      const revenueStr = item[`revenue_${selectedFiscalYear}`] || '0';
      const revenue = parseFloat(revenueStr.replace(/[^0-9.-]/g, '')) || 0;
      acc[dept] = (acc[dept] || 0) + revenue;
      return acc;
    }, {});
  };

  const channelStats = calculateChannelStats();
  const departmentApplications = calculateDepartmentApplications();
  const departmentRevenue = calculateDepartmentRevenue();
  
  const totalApplications = Object.values(departmentApplications).reduce((sum: number, val: any) => sum + val, 0);
  const totalRevenue = Object.values(departmentRevenue).reduce((sum: number, val: any) => sum + val, 0);
  const totalChannelApplications = Object.values(channelStats).reduce((sum: number, val: any) => sum + val, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-slate-800 mb-4">State of Alaska</h2>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
          Comprehensive consulting analysis across five key state departments. 
          Each department has specific focus areas and key questions that guide our research and analysis.
        </p>
      </div>

      {/* AI Status Banner */}
      <div className={`rounded-2xl p-6 ${hasAPIKey ? 'bg-gradient-to-r from-green-600 to-green-800 text-white' : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {hasAPIKey ? <Zap className="w-6 h-6" /> : <Key className="w-6 h-6" />}
            <div>
              <h3 className="text-lg font-bold">
                {hasAPIKey ? 'AI-Powered Analysis Ready' : 'AI Integration Available'}
              </h3>
              <p className="text-sm opacity-90">
                {hasAPIKey 
                  ? 'OpenAI integration is active. Generate intelligent analysis and enhanced content processing.'
                  : 'Add your OpenAI API key to .env file to unlock AI-powered analysis and content enhancement.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fiscal Year Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">Analytics Dashboard</h3>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-slate-700">Fiscal Year:</label>
            <select
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <option value={2024}>2024</option>
              <option value={2023}>2023</option>
              <option value={2022}>2022</option>
            </select>
          </div>
        </div>
      </div>

      {/* New Analytics Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Count of Types per Department */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Types per Department</h3>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          {loadingAnalytics ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            </div>
          ) : typesCountData ? (
            <div className="space-y-4">
              {Object.entries(typesCountData).map(([dept, counts]: [string, any]) => {
                const total = Object.values(counts).reduce((sum: number, val: any) => sum + val, 0);
                return (
                  <div key={dept} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">{dept.split(' – ')[0]}</span>
                      <span className="text-sm text-slate-600">Total: {total}</span>
                    </div>
                    <div className="flex h-6 bg-slate-200 rounded-full overflow-hidden">
                      {Object.entries(counts).map(([type, count]: [string, any], index) => {
                        const percentage = (count / total) * 100;
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500'];
                        return count > 0 ? (
                          <div
                            key={type}
                            className={`${colors[index % colors.length]} flex items-center justify-center text-xs text-white font-medium`}
                            style={{ width: `${percentage}%` }}
                            title={`${type}: ${count}`}
                          >
                            {percentage > 10 ? count : ''}
                          </div>
                        ) : null;
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {Object.entries(counts).map(([type, count]: [string, any], index) => {
                        const colors = ['text-blue-600', 'text-green-600', 'text-yellow-600', 'text-purple-600', 'text-red-600', 'text-indigo-600', 'text-pink-600'];
                        return count > 0 ? (
                          <span key={type} className={`${colors[index % colors.length]} font-medium`}>
                            {type}: {count}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500">
              No data available
            </div>
          )}
        </div>

        {/* Pie Chart - Manual vs Online */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Application Channels</h3>
            <PieChart className="w-5 h-5 text-green-600" />
          </div>
          {loadingAnalytics ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full"></div>
            </div>
          ) : totalChannelApplications > 0 ? (
            <div className="space-y-4">
              <div className="relative w-48 h-48 mx-auto">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {Object.entries(channelStats).map(([channel, count]: [string, any], index) => {
                    const percentage = (count / totalChannelApplications) * 100;
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                    const strokeDashoffset = -Object.entries(channelStats)
                      .slice(0, index)
                      .reduce((sum, [, c]: [string, any]) => sum + (c / totalChannelApplications) * 100, 0);
                    
                    return count > 0 ? (
                      <circle
                        key={channel}
                        cx="50"
                        cy="50"
                        r="15.915"
                        fill="transparent"
                        stroke={colors[index]}
                        strokeWidth="8"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300"
                      />
                    ) : null;
                  })}
                </svg>
              </div>
              <div className="space-y-2">
                {Object.entries(channelStats).map(([channel, count]: [string, any], index) => {
                  const percentage = totalChannelApplications > 0 ? ((count / totalChannelApplications) * 100).toFixed(1) : '0';
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];
                  return count > 0 ? (
                    <div key={channel} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${colors[index]}`}></div>
                        <span className="text-sm font-medium text-slate-700">
                          {channel}
                          {channel === 'Unknown' && (
                            <AlertTriangle className="w-3 h-3 inline ml-1 text-yellow-500" title="Some records have missing channel data" />
                          )}
                        </span>
                      </div>
                      <span className="text-sm text-slate-600">{count.toLocaleString()} ({percentage}%)</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500">
              No application data available
            </div>
          )}
        </div>
      </div>

      {/* Processing Time Table and Department Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Processing Time Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Processing Times</h3>
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          {loadingAnalytics ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full"></div>
            </div>
          ) : processingTimeData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 font-semibold text-slate-700">Department</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Range</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Median</th>
                    <th className="text-left py-2 font-semibold text-slate-700">Apps</th>
                  </tr>
                </thead>
                <tbody>
                  {processingTimeData.map((dept, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-2 text-slate-600 text-xs">{dept.department.split(' – ')[0]}</td>
                      <td className="py-2 text-slate-600 text-xs">{dept.processingRange}</td>
                      <td className="py-2 text-slate-600 text-xs">{dept.medianProcessingDays}d</td>
                      <td className="py-2 text-slate-600 text-xs">{dept.totalApplications.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500">
              No processing time data available
            </div>
          )}
        </div>

        {/* Applications by Department Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Applications by Dept</h3>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          {loadingAnalytics ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full"></div>
            </div>
          ) : totalApplications > 0 ? (
            <div className="space-y-4">
              <div className="relative w-32 h-32 mx-auto">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {Object.entries(departmentApplications).map(([dept, count]: [string, any], index) => {
                    const percentage = (count / totalApplications) * 100;
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                    const strokeDashoffset = -Object.entries(departmentApplications)
                      .slice(0, index)
                      .reduce((sum, [, c]: [string, any]) => sum + (c / totalApplications) * 100, 0);
                    
                    return count > 0 ? (
                      <circle
                        key={dept}
                        cx="50"
                        cy="50"
                        r="15.915"
                        fill="transparent"
                        stroke={colors[index % colors.length]}
                        strokeWidth="6"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    ) : null;
                  })}
                </svg>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(departmentApplications)
                  .filter(([, count]) => count > 0)
                  .map(([dept, count]: [string, any], index) => {
                    const percentage = ((count / totalApplications) * 100).toFixed(1);
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                    return (
                      <div key={dept} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-slate-700 truncate">{dept.split(' – ')[0]}</span>
                        </div>
                        <span className="text-slate-600">{percentage}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500">
              No application data available
            </div>
          )}
        </div>

        {/* Revenue by Department Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Revenue by Dept</h3>
            <Target className="w-5 h-5 text-green-600" />
          </div>
          {loadingAnalytics ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full"></div>
            </div>
          ) : totalRevenue > 0 ? (
            <div className="space-y-4">
              <div className="relative w-32 h-32 mx-auto">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {Object.entries(departmentRevenue).map(([dept, revenue]: [string, any], index) => {
                    const percentage = (revenue / totalRevenue) * 100;
                    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                    const strokeDashoffset = -Object.entries(departmentRevenue)
                      .slice(0, index)
                      .reduce((sum, [, r]: [string, any]) => sum + (r / totalRevenue) * 100, 0);
                    
                    return revenue > 0 ? (
                      <circle
                        key={dept}
                        cx="50"
                        cy="50"
                        r="15.915"
                        fill="transparent"
                        stroke={colors[index % colors.length]}
                        strokeWidth="6"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    ) : null;
                  })}
                </svg>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Object.entries(departmentRevenue)
                  .filter(([, revenue]) => revenue > 0)
                  .map(([dept, revenue]: [string, any], index) => {
                    const percentage = ((revenue / totalRevenue) * 100).toFixed(1);
                    const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                    return (
                      <div key={dept} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${colors[index % colors.length]}`}></div>
                          <span className="text-slate-700 truncate">{dept.split(' – ')[0]}</span>
                        </div>
                        <span className="text-slate-600">${(revenue / 1000).toFixed(0)}K ({percentage}%)</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-500">
              No revenue data available
            </div>
          )}
        </div>
      </div>

      {/* State-Level Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Licenses by Department */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Licenses & Permits by Department</h3>
          <div className="space-y-3">
            {Object.entries(licenseStats.byDepartment).map(([dept, count]) => {
              const percentage = Math.round((count / licenseStats.totalLicenses) * 100);
              return (
                <div key={dept} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700 font-medium">{dept}</span>
                    <span className="text-slate-600">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 text-center">
            <span className="text-2xl font-bold text-slate-800">{licenseStats.totalLicenses}</span>
            <p className="text-sm text-slate-600">Total Licenses & Permits</p>
          </div>
        </div>

        {/* Chart 2: Access Percentage */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">License Status Distribution</h3>
          <div className="space-y-4">
            {Object.entries(licenseStats.accessPercentage).map(([status, percentage]) => {
              const colors = {
                'Active': 'bg-green-500',
                'Inactive': 'bg-red-500',
                'Under Review': 'bg-yellow-500'
              };
              return (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 font-medium">{status}</span>
                    <span className="text-slate-600 font-bold">{percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className={`${colors[status as keyof typeof colors]} h-3 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-slate-600">Active</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-slate-600">Inactive</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-slate-600">Under Review</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Processing Duration Range */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">Processing Duration Range</h3>
          <div className="space-y-3">
            {Object.entries(licenseStats.processingRanges).map(([range, count]) => {
              const percentage = licenseStats.totalLicenses > 0 ? Math.round((count / licenseStats.totalLicenses) * 100) : 0;
              const colors = {
                'Same Day': 'bg-green-600',
                '1-7 Days': 'bg-blue-600',
                '30-45 Days': 'bg-yellow-600',
                '60+ Days': 'bg-red-600'
              };
              return (
                <div key={range} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700 font-medium">{range}</span>
                    <span className="text-slate-600">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`${colors[range as keyof typeof colors]} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-slate-600">Fast</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-slate-600">Standard</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                <span className="text-slate-600">Extended</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                <span className="text-slate-600">Long</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consulting Content Overview */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl text-white p-8">
          <h3 className="text-2xl font-bold mb-6 text-center">Consulting Content Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-4 mb-2">
                <MessageSquare className="w-8 h-8 mx-auto" />
              </div>
              <div className="text-3xl font-bold">{totalStats.interviews}</div>
              <div className="text-blue-100 text-sm">Interviews</div>
            </div>
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-4 mb-2">
                <FileText className="w-8 h-8 mx-auto" />
              </div>
              <div className="text-3xl font-bold">{totalStats.documents}</div>
              <div className="text-blue-100 text-sm">Documents</div>
            </div>
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-4 mb-2">
                <StickyNote className="w-8 h-8 mx-auto" />
              </div>
              <div className="text-3xl font-bold">{totalStats.notes}</div>
              <div className="text-blue-100 text-sm">Notes</div>
            </div>
          </div>
        </div>

        {/* License Inventory Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-2xl font-bold text-slate-800 mb-6">State License Inventory</h3>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-slate-600 font-medium">Upload License Inventory File</p>
                <p className="text-sm text-slate-500">Drag and drop or click to select</p>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".csv,.xlsx,.xls,.json"
                  className="hidden"
                  id="license-upload"
                />
                <label
                  htmlFor="license-upload"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  Choose File
                </label>
              </div>
            </div>
            {uploadStatus && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm font-medium">{uploadStatus}</p>
              </div>
            )}
            {showDataTable && (
              <button
                onClick={() => setShowDataTable(!showDataTable)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {showDataTable ? 'Hide Data Table' : 'View Data Table'}
              </button>
            )}
            <p className="text-xs text-slate-500">
              Supported formats: CSV, Excel (.xlsx, .xls), JSON
            </p>
          </div>
        </div>
      </div>

      {/* License Data Table */}
      {showDataTable && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">License & Permit Inventory</h3>
            <div className="text-sm text-slate-600">
              {filteredData.length} of {licenseData.length} records
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search licenses..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept.split(' – ')[0]}</option>
              ))}
            </select>

            {/* Division Filter */}
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <option value="">All Divisions</option>
              {uniqueDivisions.map(division => (
                <option key={division} value={division}>{division}</option>
              ))}
            </select>

            {/* Title Filter */}
            <input
              type="text"
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              placeholder="Filter by title..."
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            />

            {/* Approving Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <option value="">All Entities</option>
              {uniqueEntities.map(entity => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Division</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">License/Permit Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Approving Entity</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Processing Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Fee</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Renewal</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600">{item.department.split(' – ')[0]}</td>
                    <td className="py-3 px-4 text-slate-600">{item.division}</td>
                    <td className="py-3 px-4 text-slate-600">{item.licensePermitTitle}</td>
                    <td className="py-3 px-4 text-slate-600">{item.approvingEntity}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {editingRow === item.id ? (
                        <input
                          type="text"
                          value={editData.description || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      ) : (
                        <span className="line-clamp-2">{item.description}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {editingRow === item.id ? (
                        <input
                          type="text"
                          value={editData.processingTime || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, processingTime: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      ) : (
                        item.processingTime
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {editingRow === item.id ? (
                        <input
                          type="text"
                          value={editData.fee || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, fee: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      ) : (
                        item.fee
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {editingRow === item.id ? (
                        <input
                          type="text"
                          value={editData.renewalPeriod || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, renewalPeriod: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      ) : (
                        item.renewalPeriod
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingRow === item.id ? (
                        <select
                          value={editData.status || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as any }))}
                          className="px-2 py-1 border border-slate-300 rounded text-xs"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Under Review">Under Review</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'Active' ? 'bg-green-100 text-green-700' :
                          item.status === 'Inactive' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingRow === item.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handleSave}
                            className="p-1 text-green-600 hover:text-green-700 transition-colors"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1 text-red-600 hover:text-red-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500">No records match your current filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Department Tiles */}
      <div>
        <h3 className="text-2xl font-bold text-slate-800 mb-6">Alaska State Departments</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {departments.map(department => {
            const stats = getDepartmentStats(department.id);
            
            return (
              <div
                key={department.id}
                onClick={() => openDepartmentTab(department.id)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              >
                <div className="p-6 text-center">
                  {/* Department Icon */}
                  <div className="bg-blue-100 text-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                    <Building className="w-8 h-8" />
                  </div>
                  
                  {/* Department Info */}
                  <h4 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">
                    {department.shortName}
                  </h4>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {department.description}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-center space-x-4 text-xs mb-4">
                    {stats.interviews > 0 && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <MessageSquare className="w-3 h-3" />
                        <span>{stats.interviews}</span>
                      </div>
                    )}
                    {stats.documents > 0 && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <FileText className="w-3 h-3" />
                        <span>{stats.documents}</span>
                      </div>
                    )}
                    {stats.notes > 0 && (
                      <div className="flex items-center space-x-1 text-purple-600">
                        <StickyNote className="w-3 h-3" />
                        <span>{stats.notes}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Open Indicator */}
                  <div className="flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                    <ExternalLink className="w-4 h-4 mr-1" />
                    <span className="text-xs">View Details</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="bg-slate-50 rounded-xl p-8">
        <h3 className="text-xl font-bold text-slate-800 mb-4">Getting Started with Your Consulting Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 text-blue-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="font-bold">1</span>
            </div>
            <h4 className="font-semibold text-slate-800 mb-2">Upload License Inventory</h4>
            <p className="text-slate-600 text-sm">Start by uploading the state license inventory file to establish baseline data.</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 text-green-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="font-bold">2</span>
            </div>
            <h4 className="font-semibold text-slate-800 mb-2">Select Department</h4>
            <p className="text-slate-600 text-sm">Click on any department tile to view detailed overview and add content.</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 text-purple-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="font-bold">3</span>
            </div>
            <h4 className="font-semibold text-slate-800 mb-2">Generate Analysis</h4>
            <p className="text-slate-600 text-sm">Gather content and use AI-powered analysis to create comprehensive reports.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateOverview;