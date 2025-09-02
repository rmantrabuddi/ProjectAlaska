import React, { useState, useEffect } from 'react';
import { BarChart3, PieChart, TrendingUp, DollarSign, FileText, Users, Brain, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LabelList } from 'recharts';
import { DatabaseService, InventoryData, isSupabaseConfigured } from '../lib/supabase';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

interface AIAnalysisProps {
  data?: {
    interviews: any[];
    documents: any[];
    inventory: any[];
  };
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ data }) => {
  const [inventoryData, setInventoryData] = useState<InventoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        const data = await DatabaseService.getInventoryData();
        setInventoryData(data);
      } else {
        setInventoryData([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = () => inventoryData;

  const getSummaryStats = () => {
    const filteredData = getFilteredData();
    const totalRecords = filteredData.length;
    const uniqueDepartments = new Set(filteredData.map(item => item.department_name)).size;
    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.revenue_2025 || 0), 0);
    const totalApplications = filteredData.reduce((sum, item) => sum + (item.volume_2025 || 0), 0);

    return {
      totalRecords,
      uniqueDepartments,
      totalRevenue,
      totalApplications
    };
  };

  const getLicenseTypesData = () => {
    const filteredData = getFilteredData();
    const departmentData: { [key: string]: { [type: string]: number } } = {};
    
    filteredData.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      const licenseType = item.license_permit_type || 'Other';
      
      if (!departmentData[deptName]) {
        departmentData[deptName] = { License: 0, Permit: 0, Registration: 0, Certificate: 0, Other: 0 };
      }
      
      if (licenseType.toLowerCase().includes('license')) {
        departmentData[deptName].License++;
      } else if (licenseType.toLowerCase().includes('permit')) {
        departmentData[deptName].Permit++;
      } else if (licenseType.toLowerCase().includes('registration')) {
        departmentData[deptName].Registration++;
      } else if (licenseType.toLowerCase().includes('certificate')) {
        departmentData[deptName].Certificate++;
      } else {
        departmentData[deptName].Other++;
      }
    });
    
    return Object.entries(departmentData).map(([department, types]) => ({
      department,
      ...types
    }));
  };

  const getDepartmentDivisionData = () => {
    const filteredData = getFilteredData();
    const departmentData: { [key: string]: { [division: string]: number } } = {};
    
    filteredData.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      const divisionName = item.division || 'Other';
      
      if (!departmentData[deptName]) {
        departmentData[deptName] = {};
      }
      
      departmentData[deptName][divisionName] = (departmentData[deptName][divisionName] || 0) + 1;
    });
    
    const allDivisions = new Set<string>();
    Object.values(departmentData).forEach(deptDivisions => {
      Object.keys(deptDivisions).forEach(division => allDivisions.add(division));
    });
    
    return Object.entries(departmentData).map(([department, divisions]) => {
      const result: any = { department };
      allDivisions.forEach(division => {
        result[division] = divisions[division] || 0;
      });
      return result;
    });
  };

  const getUniqueDivisions = () => {
    const filteredData = getFilteredData();
    const divisions = new Set<string>();
    filteredData.forEach(item => {
      divisions.add(item.division || 'Other');
    });
    return Array.from(divisions);
  };

  const getChannelData = () => {
    const filteredData = getFilteredData();
    const channelCounts = { Online: 0, Manual: 0, Both: 0, Unknown: 0 };
    
    filteredData.forEach(item => {
      const accessMode = (item.access_mode || '').toLowerCase();
      if (accessMode.includes('online') || accessMode.includes('digital')) {
        channelCounts.Online += item.volume_2025 || 0;
      } else if (accessMode.includes('manual') || accessMode.includes('paper')) {
        channelCounts.Manual += item.volume_2025 || 0;
      } else if (accessMode.includes('both')) {
        channelCounts.Both += item.volume_2025 || 0;
      } else {
        channelCounts.Unknown += item.volume_2025 || 0;
      }
    });
    
    return Object.entries(channelCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  };

  const getApplicationsData = () => {
    const filteredData = getFilteredData();
    const departmentData: { [key: string]: number } = {};
    
    filteredData.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      departmentData[deptName] = (departmentData[deptName] || 0) + (item.volume_2025 || 0);
    });
    
    return Object.entries(departmentData)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getRevenueData = () => {
    const filteredData = getFilteredData();
    const departmentData: { [key: string]: number } = {};
    
    filteredData.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      departmentData[deptName] = (departmentData[deptName] || 0) + (item.revenue_2025 || 0);
    });
    
    return Object.entries(departmentData)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getProcessingTimeData = () => {
    const filteredData = getFilteredData();
    const departmentData: { [key: string]: { totalTime: number, totalVolume: number } } = {};
    
    filteredData.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      if (!departmentData[deptName]) {
        departmentData[deptName] = { totalTime: 0, totalVolume: 0 };
      }
      
      const processingTime = item.processing_time_2025 || 0;
      const volume = item.volume_2025 || 0;
      
      departmentData[deptName].totalTime += processingTime * volume;
      departmentData[deptName].totalVolume += volume;
    });
    
    return Object.entries(departmentData)
      .filter(([_, data]) => data.totalVolume > 0)
      .map(([department, data]) => ({
        department,
        avgProcessingDays: data.totalVolume > 0 ? Math.round(data.totalTime / data.totalVolume) : 0,
        totalApplications: data.totalVolume
      }))
      .sort((a, b) => b.totalApplications - a.totalApplications);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const stats = getSummaryStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">AI Analysis Dashboard</h2>
        <p className="text-gray-600">Comprehensive analytics and insights for Alaska state department operations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRecords.toLocaleString()}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Departments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.uniqueDepartments}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue (2025)</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Applications (2025)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalApplications.toLocaleString()}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* License Types by Department */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">License Types by Department</h3>
          <div style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getLicenseTypesData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="department" 
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                  fontSize={11}
                  tickFormatter={(value) => {
                    if (value.length > 15) {
                      const words = value.split(' ');
                      const mid = Math.ceil(words.length / 2);
                      return words.slice(0, mid).join(' ');
                    }
                    return value;
                  }}
                />
                <YAxis label={{ value: 'Number of License Types', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value, name) => [`${value} types`, name]}
                  labelFormatter={(label) => `Department: ${label}`}
                />
                <Legend />
                <Bar dataKey="License" stackId="a" fill="#3B82F6" name="License">
                  <LabelList dataKey="License" position="center" fontSize={10} fill="white" formatter={(value: number) => value > 0 ? value : ''} />
                </Bar>
                <Bar dataKey="Permit" stackId="a" fill="#10B981" name="Permit">
                  <LabelList dataKey="Permit" position="center" fontSize={10} fill="white" formatter={(value: number) => value > 0 ? value : ''} />
                </Bar>
                <Bar dataKey="Registration" stackId="a" fill="#F59E0B" name="Registration">
                  <LabelList dataKey="Registration" position="center" fontSize={10} fill="white" formatter={(value: number) => value > 0 ? value : ''} />
                </Bar>
                <Bar dataKey="Certificate" stackId="a" fill="#EF4444" name="Certificate">
                  <LabelList dataKey="Certificate" position="center" fontSize={10} fill="white" formatter={(value: number) => value > 0 ? value : ''} />
                </Bar>
                <Bar dataKey="Other" stackId="a" fill="#8B5CF6" name="Other">
                  <LabelList dataKey="Other" position="center" fontSize={10} fill="white" formatter={(value: number) => value > 0 ? value : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            <p>Distribution of license and permit types across Alaska state departments</p>
          </div>
        </div>

        {/* Department Records by Division */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Records by Division</h3>
          <div style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getDepartmentDivisionData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="department" 
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                  fontSize={11}
                  tickFormatter={(value) => {
                    if (value.length > 15) {
                      const words = value.split(' ');
                      const mid = Math.ceil(words.length / 2);
                      return words.slice(0, mid).join(' ');
                    }
                    return value;
                  }}
                />
                <YAxis label={{ value: 'Number of Records', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value, name) => [`${value} records`, name]}
                  labelFormatter={(label) => `Department: ${label}`}
                />
                <Legend />
                {getUniqueDivisions().map((division, index) => (
                  <Bar 
                    key={division}
                    dataKey={division} 
                    stackId="divisions" 
                    fill={COLORS[index % COLORS.length]} 
                    name={division}
                  >
                    <LabelList 
                      dataKey={division} 
                      position="center" 
                      fontSize={10} 
                      fill="white" 
                      formatter={(value: number) => value > 0 ? value : ''} 
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            <p>Number of records by department, stacked by division type</p>
          </div>
        </div>
      </div>

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Digitized Process Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Access Channel Distribution</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={getChannelData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getChannelData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} applications`, 'Volume']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            <p>Distribution of application processing channels</p>
          </div>
        </div>

        {/* Applications by Department */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications by Department</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={getApplicationsData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getApplicationsData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} applications`, 'Volume']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            <p>Total application volume distribution</p>
          </div>
        </div>

        {/* Revenue by Department */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Department</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={getRevenueData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: $${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getRevenueData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            <p>Revenue distribution for fiscal year 2025</p>
          </div>
        </div>
      </div>

      {/* Processing Time Analysis Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Processing Time Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Processing Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Applications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency Rating</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getProcessingTimeData().map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.avgProcessingDays} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.totalApplications.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.avgProcessingDays <= 7 ? 'bg-green-100 text-green-800' :
                      item.avgProcessingDays <= 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.avgProcessingDays <= 7 ? 'Excellent' :
                       item.avgProcessingDays <= 30 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h3>
          </div>
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <Zap className="w-4 h-4" />
            <span>Generate Comprehensive Analysis</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-blue-900 mb-3">Key Findings</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                Processing times vary significantly across departments
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                Digital transformation opportunities identified
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                Revenue optimization potential in high-volume processes
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-purple-900 mb-3">Opportunities</h4>
            <ul className="space-y-2 text-sm text-purple-800">
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                Standardize processing workflows across divisions
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                Implement automated approval systems
              </li>
              <li className="flex items-start">
                <span className="text-purple-600 mr-2">•</span>
                Enhance inter-departmental data sharing
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {stats.totalRecords === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <BarChart3 className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data available for analysis</h3>
          <p className="text-gray-500">
            Upload inventory data through the Data Gathering tab to see comprehensive analytics and AI-powered insights.
          </p>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;