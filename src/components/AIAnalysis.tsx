import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Target, Lightbulb, Loader2, BarChart3, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { openAIService, AIAnalysisResult } from '../services/openai';
import { DatabaseService, InventoryData } from '../lib/supabase';
import InterviewUpload from './InterviewUpload';

interface AIAnalysisProps {
  data: {
    interviews: any[];
    documents: any[];
    inventory: any[];
  };
  selectedDepartment?: string;
}

interface DashboardFilters {
  department: string;
  division: string;
  licenseType: string;
}

interface ProcessingTimeData {
  department: string;
  avgProcessingDays: number;
  totalApplications: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

const AIAnalysis: React.FC<AIAnalysisProps> = ({ data, selectedDepartment }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryData[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const [filters, setFilters] = useState<DashboardFilters>({
    department: '',
    division: '',
    licenseType: '',
  });

  // Load inventory data for dashboard
  useEffect(() => {
    loadDashboardData();
  }, [filters.department, filters.division, filters.licenseType]); // only re-run on these

  const loadDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const data = await DatabaseService.getInventoryData({
        department: filters.department || undefined,
        division: filters.division || undefined,
        licenseType: filters.licenseType || undefined
      });
      setInventoryData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Filter by department/division/license type only
  const getFilteredData = () => {
    const dept = filters.department;
    const div = filters.division.trim().toLowerCase();
    const lic = filters.licenseType.trim().toLowerCase();

    return inventoryData.filter(item => {
      if (dept && item.department_name !== dept) return false;
      if (div && !(item.division || '').toLowerCase().includes(div)) return false;
      if (lic && !(item.license_permit_type || '').toLowerCase().includes(lic)) return false;
      return true;
    });
  };

  // 1) Stacked bar: count of unique license types per division per department (unchanged)
  const getDepartmentTypeData = () => {
    const filteredData = getFilteredData();
    const departmentMap = new Map<string, Map<string, Set<string>>>();

    filteredData.forEach(item => {
      const dept = item.department_name.replace('Department of ', '');
      const division = item.division || 'Other';
      const licenseType = item.license_permit_type;

      if (!departmentMap.has(dept)) departmentMap.set(dept, new Map());
      const deptMap = departmentMap.get(dept)!;
      if (!deptMap.has(division)) deptMap.set(division, new Set());
      deptMap.get(division)!.add(licenseType);
    });

    return Array.from(departmentMap.entries()).map(([dept, divisions]) => {
      const result: any = { department: dept };
      let total = 0;
      divisions.forEach((types, division) => {
        result[division] = types.size;
        total += types.size;
      });
      result.total = total;
      return result;
    }).sort((a, b) => b.total - a.total);
  };

  // 2) Channel pie (2024 only; weights by volume_2024)
  const getChannelData = () => {
    const filteredData = getFilteredData();
    const channelCounts = { Manual: 0, Online: 0, Both: 0, Unknown: 0 };

    filteredData.forEach(item => {
      const totalApplications = (item.volume_2024 ?? 0);
      const accessMode = (item as any).access_mode?.toLowerCase() || '';

      if (totalApplications <= 0) return;

      if (accessMode.includes('online') && (accessMode.includes('manual') || accessMode.includes('in-person') || accessMode.includes('mail'))) {
        channelCounts.Both += totalApplications;
      } else if (accessMode.includes('online')) {
        channelCounts.Online += totalApplications;
      } else if (accessMode.includes('manual') || accessMode.includes('in-person') || accessMode.includes('mail')) {
        channelCounts.Manual += totalApplications;
      } else {
        channelCounts.Unknown += totalApplications;
      }
    });

    const total = Object.values(channelCounts).reduce((s, n) => s + n, 0);

    return Object.entries(channelCounts)
      .filter(([_, count]) => count > 0)
      .map(([channel, count]) => ({
        name: channel,
        value: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0'
      }));
  };

  // 3) Processing table (2024 only; weighted by volume_2024)
  const getProcessingTimeData = (): ProcessingTimeData[] => {
    const filteredData = getFilteredData();
    const departmentMap = new Map<string, { totalWeightedDays: number; totalApplications: number }>();

    filteredData.forEach(item => {
      const dept = item.department_name.replace('Department of ', '');
      const apps = item.volume_2024 ?? 0;
      const p = item.processing_time_2024 ?? 0;

      if (apps > 0) {
        if (!departmentMap.has(dept)) departmentMap.set(dept, { totalWeightedDays: 0, totalApplications: 0 });
        const d = departmentMap.get(dept)!;
        d.totalWeightedDays += p * apps;
        d.totalApplications += apps;
      }
    });

    return Array.from(departmentMap.entries())
      .map(([dept, data]) => ({
        department: dept,
        avgProcessingDays: data.totalApplications > 0 ? data.totalWeightedDays / data.totalApplications : 0,
        totalApplications: data.totalApplications
      }))
      .sort((a, b) => b.avgProcessingDays - a.avgProcessingDays);
  };

  // 4) Applications pie (2024 only)
  const getApplicationsData = () => {
    const filteredData = getFilteredData();
    const departmentMap = new Map<string, number>();

    filteredData.forEach(item => {
      const dept = item.department_name.replace('Department of ', '');
      const apps = item.volume_2024 ?? 0;
      departmentMap.set(dept, (departmentMap.get(dept) || 0) + apps);
    });

    const total = Array.from(departmentMap.values()).reduce((s, n) => s + n, 0);

    return Array.from(departmentMap.entries())
      .filter(([_, count]) => count > 0)
      .map(([dept, count]) => ({
        name: dept,
        value: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.value - a.value);
  };

  // 5) Revenue pie (2024 only)
  const getRevenueData = () => {
    const filteredData = getFilteredData();
    const departmentMap = new Map<string, number>();

    filteredData.forEach(item => {
      const dept = item.department_name.replace('Department of ', '');
      const rev = item.revenue_2024 ?? 0;
      departmentMap.set(dept, (departmentMap.get(dept) || 0) + rev);
    });

    const total = Array.from(departmentMap.values()).reduce((s, n) => s + n, 0);

    return Array.from(departmentMap.entries())
      .filter(([_, count]) => count > 0)
      .map(([dept, count]) => ({
        name: dept,
        value: count,
        percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
        formattedValue: `$${count.toLocaleString()}`
      }))
      .sort((a, b) => b.value - a.value);
  };

  const generateAnalysis = async () => {
    if (!openAIService.isConfigured()) {
      setError('OpenAI API key not configured. Please add your API key to enable AI analysis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: AIAnalysisResult;

      if (selectedDepartment) {
        const departmentInterviews = data.interviews.filter(
          interview => interview.department === selectedDepartment
        );
        const interviewTexts = departmentInterviews.map(interview => interview.notes);
        result = await openAIService.analyzeInterviewNotes(interviewTexts, selectedDepartment);
      } else {
        result = await openAIService.summarizeAcrossDepartments(data);
      }

      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  const generateDataInsights = async () => {
    if (!openAIService.isConfigured()) {
      setError('OpenAI API key not configured. Please add your API key to enable AI analysis.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await openAIService.generateDataInsights(inventoryData);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during data analysis');
    } finally {
      setLoading(false);
    }
  };

  const departmentTypeData = getDepartmentTypeData();
  const channelData = getChannelData();
  const processingTimeData = getProcessingTimeData();
  const applicationsData = getApplicationsData();
  const revenueData = getRevenueData();

  // Unique divisions for stacked bar legend/series
  const allDivisions = Array.from(
    new Set(getFilteredData().map(item => item.division || 'Other'))
  ).sort();

  if (!openAIService.isConfigured()) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-800">AI Analysis Unavailable</h3>
            <p className="text-yellow-700 mt-1">
              To enable AI-powered analysis, please add your OpenAI API key to the environment variables.
            </p>
            <p className="text-sm text-yellow-600 mt-2">
              Add <code>VITE_OPENAI_API_KEY=your_api_key_here</code> to your .env file
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Interview Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Interview Notes</h2>
        <InterviewUpload />
      </div>

      {/* Global Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-6 h-6 mr-2 text-blue-600" />
          Dashboard Filters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {Array.from(new Set(inventoryData.map(item => item.department_name))).map(dept => (
                <option key={dept} value={dept}>{dept.replace('Department of ', '')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
            <input
              type="text"
              value={filters.division}
              onChange={(e) => setFilters({ ...filters, division: e.target.value })}
              placeholder="Filter by division"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">License Type</label>
            <input
              type="text"
              value={filters.licenseType}
              onChange={(e) => setFilters({ ...filters, licenseType: e.target.value })}
              placeholder="Filter by license type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Alaska Statewide Summary Dashboard */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 className="w-7 h-7 mr-3 text-blue-600" />
          Alaska Statewide Summary Dashboard
        </h2>

        {dashboardLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading dashboard data...</span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Row 1: Bar Chart and Channel Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Bar Chart - Count of Types per Department */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">License Types by Department</h3>
                <div className="h-80">
                      interval={0}
                      width={80}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getDepartmentTypeData()}>
                    <Tooltip 
                      formatter={(value: any, name: any) => [value, `${name} (${value} types)`]}
                      labelFormatter={(label: any) => `Department: ${label}`}
                    />
                      <XAxis 
                        dataKey="department" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        fontSize={12}
                      />
                      <YAxis />
                      <Tooltip />
                      {allDivisions.map((division, index) => (
                        <Bar 
                          key={division}
                          dataKey={division}
                          stackId="a"
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Pie Chart - Manual vs Online (2024) */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Digitized Process (2024)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={getChannelData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage, value }: any) => `${name}: ${Number(value).toLocaleString()} (${percentage}%)`}
                      >
                        {getChannelData().map((_, index) => (
                          <Cell key={`cell-ch-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any) => [
                          `${Number(value).toLocaleString()} applications`, 
                          `${name} Access`
                        ]} 
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Application volume by access method (2024)</p>
                </div>
              </div>
            </div>

            {/* Row 2: Processing Time Table (2024) */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Processing Time by Department (2024)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Processing Days (Weighted)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Applications (2024)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getProcessingTimeData().map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="max-w-xs">
                            <div className="truncate" title={row.department}>
                              {row.department}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.avgProcessingDays.toFixed(1)} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
              <div className="mt-2 text-xs text-gray-600">
                <p>Total unique license types by department and division</p>
              </div>
            </div>

            {/* Row 3: Applications and Revenue Distribution (2024) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Applications by Department (2024) */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications Processed by Department (2024)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={getApplicationsData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage, value }: any) => `${name}: ${Number(value).toLocaleString()} (${percentage}%)`}
                      >
                        {getApplicationsData().map((_, index) => (
                          <Cell key={`cell-app-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any) => [
                          `${Number(value).toLocaleString()} applications`, 
                          name
                        ]} 
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Total applications processed by department (2024)</p>
                </div>
              </div>

              {/* Revenue by Department (2024) */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Department (2024)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={getRevenueData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage, value }: any) => `${name}: $${Number(value).toLocaleString()} (${percentage}%)`}
                      >
                        {getRevenueData().map((_, index) => (
                          <Cell key={`cell-rev-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any) => [
                          `$${Number(value).toLocaleString()}`, 
                          name
                        ]} 
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Total revenue generated by department (2024)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Analysis Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Brain className="w-6 h-6 mr-2 text-blue-600" />
          AI-Powered Analysis
        </h2>

        <div className="flex space-x-4">
          <button
            onClick={generateAnalysis}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Brain className="w-5 h-5 mr-2" />}
            {selectedDepartment ? `Analyze ${selectedDepartment}` : 'Cross-Department Analysis'}
          </button>

          <button
            onClick={generateDataInsights}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <TrendingUp className="w-5 h-5 mr-2" />}
            Analyze Data Trends
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
            <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Lightbulb className="w-6 h-6 text-blue-600 mr-2" />
                <h4 className="text-lg font-semibold text-blue-900">Key Insights</h4>
              </div>
              <ul className="space-y-2">
                {analysis.keyInsights.map((insight, index) => (
                  <li key={index} className="text-blue-800 text-sm">• {insight}</li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
                <h4 className="text-lg font-semibold text-red-900">Challenges</h4>
              </div>
              <ul className="space-y-2">
                {analysis.challenges.map((challenge, index) => (
                  <li key={index} className="text-red-800 text-sm">• {challenge}</li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Target className="w-6 h-6 text-green-600 mr-2" />
                <h4 className="text-lg font-semibold text-green-900">Opportunities</h4>
              </div>
              <ul className="space-y-2">
                {analysis.opportunities.map((opportunity, index) => (
                  <li key={index} className="text-green-800 text-sm">• {opportunity}</li>
                ))}
              </ul>
            </div>

            <div className="bg-purple-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-600 mr-2" />
                <h4 className="text-lg font-semibold text-purple-900">Recommendations</h4>
              </div>
              <ul className="space-y-2">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-purple-800 text-sm">• {recommendation}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Data...</h3>
          <p className="text-gray-500">AI is processing your data to generate insights and recommendations.</p>
        </div>
      )}

      {!analysis && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for AI Analysis</h3>
          <p className="text-gray-500 mb-4">
            Click one of the analysis buttons above to generate AI-powered insights from your data.
          </p>
          <div className="text-sm text-gray-400">
            <p>Available analysis types:</p>
            <ul className="mt-2 space-y-1">
              <li>• Cross-department analysis of all data</li>
              <li>• Data trends and patterns analysis</li>
              <li>• Department-specific insights</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalysis;