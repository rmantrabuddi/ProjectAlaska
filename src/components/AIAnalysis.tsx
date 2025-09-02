import { supabase, ensureAuth } from "../lib/supabase";
ensureAuth();
import React, { useState } from 'react';
import { Upload, Download, Filter, Search, Edit3, Save, X, Brain, Database, Building, TrendingUp, FileText } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DatabaseService, InventoryData, Department, isSupabaseConfigured } from '../lib/supabase';
import { openAIService } from '../services/openai';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LabelList } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const DataGathering: React.FC = () => {
  const [data, setData] = useState<InventoryData[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    department_name: '',
    division: '',
    license_permit_type: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<InventoryData | null>(null);

  // Load data on component mount
  React.useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Only attempt to load data if Supabase is properly configured
      if (!isSupabaseConfigured()) {
        // Use mock data when Supabase is not configured
        const mockDepartments = [
          { id: '1', name: 'Department of Commerce, Community, and Economic Development', short_name: 'Commerce', description: '', status: 'Active', created_at: '', updated_at: '' },
          { id: '2', name: 'Department of Fish and Game', short_name: 'Fish & Game', description: '', status: 'Active', created_at: '', updated_at: '' },
          { id: '3', name: 'Department of Natural Resources', short_name: 'Natural Resources', description: '', status: 'Active', created_at: '', updated_at: '' },
          { id: '4', name: 'Department of Environmental Conservation', short_name: 'Environmental', description: '', status: 'Active', created_at: '', updated_at: '' },
          { id: '5', name: 'Department of Administration, Division of Motor Vehicles', short_name: 'Motor Vehicles', description: '', status: 'Active', created_at: '', updated_at: '' }
        ];
        setDepartments(mockDepartments);
        setData([]);
        setFilteredData([]);
        return;
      }

      const [departmentsData, inventoryData] = await Promise.all([
        DatabaseService.getDepartments(),
        DatabaseService.getInventoryData()
      ]);
      setDepartments(departmentsData);
      setData(inventoryData);
      setFilteredData(inventoryData);
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Parse CSV/Excel file and save to database
      console.log('File uploaded:', file.name);
      parseAndSaveFile(file);
    }
  };

  const parseAndSaveFile = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      // Check file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
        throw new Error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      }

      let parsedData: any[] = [];

      if (fileExtension === 'csv') {
        // Parse CSV file
        parsedData = await parseCSVFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel file
        parsedData = await parseExcelFile(file);
      }

      if (parsedData.length === 0) {
        throw new Error('No data found in the uploaded file');
      }

      // Validate and transform data
      const validatedData = validateAndTransformData(parsedData);
      
      if (validatedData.length === 0) {
        throw new Error('No valid data rows found. Please check the file format and column names.');
      }

      // Save to database if Supabase is configured
      if (isSupabaseConfigured()) {
        const savedData = await DatabaseService.bulkInsertInventoryData(validatedData);
        setData(prev => [...prev, ...savedData]);
        setFilteredData(prev => [...prev, ...savedData]);
        alert(`Successfully uploaded and saved ${savedData.length} records to the database!`);
      } else {
        // Just add to local state if no database
        const dataWithIds = validatedData.map(item => ({
          ...item,
          id: Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        setData(prev => [...prev, ...dataWithIds]);
        setFilteredData(prev => [...prev, ...dataWithIds]);
        alert(`Successfully uploaded ${dataWithIds.length} records! Note: Data is not saved to database (Supabase not configured).`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const parseCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  };

  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length < 2) {
            reject(new Error('Excel file must have at least a header row and one data row'));
            return;
          }
          
          // Convert array of arrays to array of objects
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[][];
          
          const parsedData = rows
            .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
            .map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index] || '';
              });
              return obj;
            });
          
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${(error as Error).message}`));
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read Excel file'));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const validateAndTransformData = (rawData: any[]): Omit<InventoryData, 'id' | 'created_at' | 'updated_at'>[] => {
    const requiredColumns = [
      'department_name',
      'division',
      'license_permit_type'
    ];

    const validatedData: Omit<InventoryData, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const row of rawData) {
      // Check if required columns exist
      console.log(row);
      const missingColumns = requiredColumns.filter(col => !row[col] || row[col].toString().trim() === '');
      if (missingColumns.length > 0) {
        console.warn(`Skipping row due to missing required columns: ${missingColumns.join(', ')}`, row);
        continue;
      }

      // Find department_id from departments list
      const department = departments.find(d => 
        d.name.toLowerCase() === row.department_name.toString().toLowerCase() ||
        d.short_name.toLowerCase() === row.department_name.toString().toLowerCase()
      );

      const transformedRow: Omit<InventoryData, 'id' | 'created_at' | 'updated_at'> = {
        department_id: department?.id || '',
        department_name: row.department_name.toString().trim(),
        division: row.division.toString().trim(),
        license_permit_type: row.license_permit_type.toString().trim(),
        description: row.description?.toString().trim() || '',
        access_mode: row.access_mode?.toString().trim() || '',
        regulations: row.regulations?.toString().trim() || '',
        user_type: row.user_type?.toString().trim() || '',
        cost: row.cost?.toString().trim() || '',
        revenue_2023: parseFloat(row.revenue_2023?.toString().replace(/[,$]/g, '') || '0') || 0,
        revenue_2024: parseFloat(row.revenue_2024?.toString().replace(/[,$]/g, '') || '0') || 0,
        revenue_2025: parseFloat(row.revenue_2025?.toString().replace(/[,$]/g, '') || '0') || 0,
        processing_time_2023: parseFloat(row.processing_time_2023?.toString() || '0') || 0,
        processing_time_2024: parseFloat(row.processing_time_2024?.toString() || '0') || 0,
        processing_time_2025: parseFloat(row.processing_time_2025?.toString() || '0') || 0,
        volume_2023: parseInt(row.volume_2023?.toString() || '0') || 0,
        volume_2024: parseInt(row.volume_2024?.toString() || '0') || 0,
        volume_2025: parseInt(row.volume_2025?.toString() || '0') || 0,
        status: 'Active' as const
      };
      console.log(transformedRow)
      validatedData.push(transformedRow);
    }

    return validatedData;
  };

  const applyFilters = () => {
    let filtered = data;
    
    if (filters.department_name) {
      filtered = filtered.filter(item => item.department_name === filters.department_name);
    }
    if (filters.division) {
      filtered = filtered.filter(item => item.division.toLowerCase().includes(filters.division.toLowerCase()));
    }
    if (filters.license_permit_type) {
      filtered = filtered.filter(item => item.license_permit_type.toLowerCase().includes(filters.license_permit_type.toLowerCase()));
    }
    if (searchTerm) {
      filtered = filtered.filter(item =>
        Object.values(item).some(value =>
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    setFilteredData(filtered);
  };

  React.useEffect(() => {
    applyFilters();
  }, [filters, searchTerm, data]);

  const handleEdit = (item: InventoryData) => {
    setEditingId(item.id);
    setEditingData({ ...item });
  };

  const handleSave = async () => {
    if (editingData) {
      try {
        const updatedItem = await DatabaseService.updateInventoryData(editingData.id, editingData);
        const updatedData = data.map(item =>
          item.id === editingData.id ? updatedItem : item
        );
        setData(updatedData);
        applyFilters();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save changes');
      }
      setEditingId(null);
      setEditingData(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData(null);
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
    const channelCounts: { [key: string]: number } = {};
    
    data.forEach(item => {
      const mode = item.access_mode || 'Unknown';
      channelCounts[mode] = (channelCounts[mode] || 0) + ((item as any).volume_2025 || 0);
    });
    
    const total = Object.values(channelCounts).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(channelCounts).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0
    }));
  };

  const getProcessingTimeData = () => {
    const departmentData: { [key: string]: { totalTime: number, totalVolume: number } } = {};
    
    data.forEach(item => {
      const deptName = item.department_name;
      if (!departmentData[deptName]) {
        departmentData[deptName] = { totalTime: 0, totalVolume: 0 };
      }
      
      const volume = (item as any).volume_2025 || 0;
      const processingTime = (item as any).processing_time_2025 || 0;
      
      departmentData[deptName].totalTime += processingTime * volume;
      departmentData[deptName].totalVolume += volume;
    });
    
    return Object.entries(departmentData)
      .map(([department, data]) => ({
        department,
        avgProcessingDays: data.totalVolume > 0 ? data.totalTime / data.totalVolume : 0,
        totalApplications: data.totalVolume
      }))
      .sort((a, b) => b.totalApplications - a.totalApplications);
  };

  const getApplicationsData = () => {
    const departmentData: { [key: string]: number } = {};
    
    data.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      departmentData[deptName] = (departmentData[deptName] || 0) + ((item as any).volume_2025 || 0);
    });
    
    const total = Object.values(departmentData).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(departmentData).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0
    }));
  };

  const getRevenueData = () => {
    const departmentData: { [key: string]: number } = {};
    
    data.forEach(item => {
      const deptName = item.department_name.replace('Department of ', '');
      departmentData[deptName] = (departmentData[deptName] || 0) + ((item as any).revenue_2025 || 0);
    });
    
    const total = Object.values(departmentData).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(departmentData).map(([name, value]) => ({
      name,
      value,
      formattedValue: `$${value.toLocaleString()}`,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0
    }));
  };

  if (loading && data.length === 0) {
    return <div className="flex justify-center items-center h-64">
      <div className="text-lg">Loading dashboard data...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 text-sm mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

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

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters & Search
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={filters.department_name}
                onChange={(e) => setFilters({ ...filters, department_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
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
                value={filters.license_permit_type}
                onChange={(e) => setFilters({ ...filters, license_permit_type: e.target.value })}
                placeholder="Filter by license type"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search all fields"
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Analysis */}
        {data.length > 0 ? (
          <div className="space-y-6">
            {/* Row 1: License Types by Department (Bar Chart) */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">License Types by Department</h3>
              <div className="h-120">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getLicenseTypesData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="department" 
                      angle={0}
                      textAnchor="middle"
                      height={60}
                      interval={0}
                      width={80}
                      fontSize={11}
                      tickFormatter={(value) => {
                        if (value.length > 15) {
                          const words = value.split(' ');
                          const mid = Math.ceil(words.length / 2);
                          return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
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
              {/* 2. Pie Chart - Manual vs Online (2025) */}
              <div className="bg-gray-50 rounded-lg p-6">
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
            </div>

            {/* Row 2: Processing Time Table (2025) */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Processing Time by Department (2025)</h3>
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
                        Total Applications (2025)
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

            {/* Row 3: Applications and Revenue Distribution (2025) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Applications by Department (2025) */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications Processed by Department (2025)</h3>
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

              {/* Revenue by Department (2025) */}
              <div className="bg-gray-50 rounded-lg p-6">
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

export default DataGathering;