import { supabase, ensureAuth } from "../lib/supabase";
ensureAuth();
import React, { useState } from 'react';
import { Brain, Database, Building, TrendingUp, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LabelList } from 'recharts';
import { DatabaseService, InventoryData, Department, isSupabaseConfigured } from '../lib/supabase';
import { openAIService } from '../services/openai';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'];

const AIAnalysis: React.FC = () => {
  const [data, setData] = useState<InventoryData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  React.useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isSupabaseConfigured()) {
        const mockDepartments = [
          { id: '1', name: 'Department of Commerce, Community, and Economic Development', short_name: 'Commerce', description: '', status: 'Active', created_at: '', updated_at: '' },
          { id: '2', name: 'Department of Fish and Game', short_name: 'Fish & Game', description: '', status: 'Active', created_at: '', updated_at: '' },
          { id: '3', name: 'Department of Natural Resources', short_name: 'Natural Resources', description: '', status: 'Active', created_at: '', updated_at: '' },
          { id: '4', name: 'Department of Environmental Conservation', short_name: 'Environmental', description: '', status: 'Active', created_at: '', updated_at: '' },
          { id: '5', name: 'Department of Administration, Division of Motor Vehicles', short_name: 'Motor Vehicles', description: '', status: 'Active', created_at: '', updated_at: '' }
        ];
        setDepartments(mockDepartments);
        setData([]);
        return;
      }

      const [departmentsData, inventoryData] = await Promise.all([
        DatabaseService.getDepartments(),
        DatabaseService.getInventoryData()
      ]);
      setDepartments(departmentsData);
      setData(inventoryData);
    } catch (err) {
      if (!isSupabaseConfigured()) {
        setError('Database not configured. Please set up your Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) to enable data persistence.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load data. Please check your database connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Chart data functions
  const getLicenseTypesData = () => {
    const departmentData: { [key: string]: { License: number, Permit: number, Registration: number, Certificate: number, Other: number } } = {};
    
    data.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      if (!departmentData[deptName]) {
        departmentData[deptName] = { License: 0, Permit: 0, Registration: 0, Certificate: 0, Other: 0 };
      }
      
      const type = item.license_permit_type.toLowerCase();
      if (type.includes('license')) {
        departmentData[deptName].License++;
      } else if (type.includes('permit')) {
        departmentData[deptName].Permit++;
      } else if (type.includes('registration')) {
        departmentData[deptName].Registration++;
      } else if (type.includes('certificate')) {
        departmentData[deptName].Certificate++;
      } else {
        departmentData[deptName].Other++;
      }
    });
    
    return Object.entries(departmentData).map(([department, counts]) => ({
      department,
      ...counts
    }));
  };

  const getChannelData = () => {
    const channelCounts = { Online: 0, Manual: 0, Both: 0, Unknown: 0 };
    
    data.forEach(item => {
      const accessMode = (item.access_mode || '').toLowerCase();
      if (accessMode.includes('online') || accessMode.includes('digital')) {
        channelCounts.Online += (item as any).volume_2025 || 0;
      } else if (accessMode.includes('manual') || accessMode.includes('paper')) {
        channelCounts.Manual += (item as any).volume_2025 || 0;
      } else if (accessMode.includes('both')) {
        channelCounts.Both += (item as any).volume_2025 || 0;
      } else {
        channelCounts.Unknown += (item as any).volume_2025 || 0;
      }
    });
    
    return Object.entries(channelCounts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  };

  const getApplicationsData = () => {
    const departmentData: { [key: string]: number } = {};
    
    data.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      departmentData[deptName] = (departmentData[deptName] || 0) + ((item as any).volume_2025 || 0);
    });
    
    return Object.entries(departmentData)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  };

  const getRevenueData = () => {
    const departmentData: { [key: string]: number } = {};
    
    data.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      departmentData[deptName] = (departmentData[deptName] || 0) + ((item as any).revenue_2025 || 0);
    });
    
    return Object.entries(departmentData)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ 
        name, 
        value, 
        formattedValue: `$${value.toLocaleString()}` 
      }));
  };

  const getProcessingTimeData = () => {
    const departmentData: { [key: string]: { totalTime: number, totalVolume: number } } = {};
    
    data.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      if (!departmentData[deptName]) {
        departmentData[deptName] = { totalTime: 0, totalVolume: 0 };
      }
      
      const processingTime = (item as any).processing_time_2025 || 0;
      const volume = (item as any).volume_2025 || 0;
      
      departmentData[deptName].totalTime += processingTime * volume;
      departmentData[deptName].totalVolume += volume;
    });
    
    return Object.entries(departmentData)
      .filter(([_, data]) => data.totalVolume > 0)
      .map(([department, data]) => ({
        department,
        avgProcessingDays: data.totalVolume > 0 ? data.totalTime / data.totalVolume : 0,
        totalApplications: data.totalVolume
      }))
      .sort((a, b) => b.totalApplications - a.totalApplications);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading AI analysis dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
          <Brain className="w-8 h-8 mr-3 text-blue-600" />
          AI Analysis Dashboard
        </h2>
        <p className="text-gray-600 mb-6">
          Comprehensive analytics and insights from Alaska state department inventory data.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Analysis Dashboard */}
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{data.length}</p>
              </div>
              <Database className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
              </div>
              <Building className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue (2025)</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${data.reduce((sum, item) => sum + ((item as any).revenue_2025 || 0), 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Applications (2025)</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.reduce((sum, item) => sum + ((item as any).volume_2025 || 0), 0).toLocaleString()}
                </p>
              </div>
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Charts and Analysis */}
        {data.length > 0 ? (
          <div className="space-y-6">
            {/* Row 1: License Types by Department (Bar Chart) */}
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

            {/* Row 2: Pie Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Digitized Process Chart */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Digitized Process (2025)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={getChannelData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getChannelData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} applications`, 'Count']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Application volume by access method (2025)</p>
                </div>
              </div>

              {/* Applications by Department */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications by Department (2025)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={getApplicationsData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getApplicationsData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} applications`, 'Count']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Total applications processed by department (2025)</p>
                </div>
              </div>
            </div>

            {/* Row 3: Revenue Chart and Processing Time Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue by Department */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Department (2025)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={getRevenueData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getRevenueData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name, props) => [props.payload.formattedValue, 'Revenue']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Total revenue generated by department (2025)</p>
                </div>
              </div>

              {/* Processing Time Table */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Time by Department (2025)</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Processing Days
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Applications
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getProcessingTimeData().map((row, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs">
                            <div className="truncate" title={row.department}>
                              {row.department}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.avgProcessingDays.toFixed(1)} days
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.totalApplications.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Weighted average processing time based on application volume</p>
                </div>
              </div>
            </div>

            {/* AI Insights Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                AI-Powered Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Key Findings</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• {departments.length} departments managing licensing and permits</li>
                    <li>• {data.length} total license and permit types tracked</li>
                    <li>• ${data.reduce((sum, item) => sum + ((item as any).revenue_2025 || 0), 0).toLocaleString()} total revenue projected for 2025</li>
                    <li>• {data.reduce((sum, item) => sum + ((item as any).volume_2025 || 0), 0).toLocaleString()} applications expected in 2025</li>
                  </ul>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Opportunities</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Standardize processing times across departments</li>
                    <li>• Increase digital adoption for manual processes</li>
                    <li>• Optimize high-volume, low-revenue license types</li>
                    <li>• Cross-departmental process harmonization</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    if (openAIService.isConfigured()) {
                      console.log('Generating comprehensive AI analysis...');
                      alert('AI analysis feature coming soon! This will generate detailed insights, recommendations, and strategic analysis based on your data.');
                    } else {
                      alert('Please configure OpenAI API key to use AI analysis features.');
                    }
                  }}
                  className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Generate Comprehensive AI Analysis
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No data available for analysis</h3>
            <p className="text-gray-500">
              Upload inventory data in the Data Gathering tab to see AI-powered insights and analytics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysis;