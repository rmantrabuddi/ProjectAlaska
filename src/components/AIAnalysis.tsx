import { supabase, ensureAuth } from "../lib/supabase";
ensureAuth();
import React, { useState } from 'react';
import { Upload, Download, Filter, Search, Edit3, Save, X, Brain } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DatabaseService, InventoryData, Department, isSupabaseConfigured } from '../lib/supabase';
import { openAIService } from '../services/openai';

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
        revenue_2024: parseFloat(row.revenue_2024?.toString().replace(/[,$]/g, '') || '0') || 0,
        revenue_2025: parseFloat(row.revenue_2025?.toString().replace(/[,$]/g, '') || '0') || 0,
        revenue_2025: parseFloat(row.revenue_2025?.toString().replace(/[,$]/g, '') || '0') || 0,
        processing_time_2024: parseFloat(row.processing_time_2024?.toString() || '0') || 0,
        processing_time_2025: parseFloat(row.processing_time_2025?.toString() || '0') || 0,
        volume_2023: parseInt(row.volume_2023?.toString() || '0') || 0,
        volume_2024: parseInt(row.volume_2024?.toString() || '0') || 0,
        volume_2025: parseInt(row.volume_2025?.toString() || '0') || 0,
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
            {/* Department Counts by Division Type */}
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

          {/* Row 2: More Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            className="text-red-600 hover:text-red-800 text-sm mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Inventory Spreadsheet</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
              Click to upload spreadsheet
            </span>
            <p className="text-gray-500 mt-2">or drag and drop your CSV or Excel file here</p>
            <div className="mt-4 text-xs text-gray-400 max-w-md mx-auto">
              <p className="font-medium mb-2">Expected columns:</p>
              <div className="text-left space-y-1">
                <p>• <strong>Required:</strong> department_name, division, license_permit_type</p>
                <p>• <strong>Optional:</strong> description, access_mode, regulations, user_type, cost</p>
                <p>• <strong>Performance:</strong> processing_time_2023/2024/2025, volume_2023/2024/2025</p>
              </div>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
          </label>
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
          </div>

          {/* Row 3: Revenue Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

            {/* Empty space for future chart */}
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm">Additional chart space</p>
                <p className="text-xs">Future analytics visualization</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Inventory Data</h3>
          <div className="flex space-x-3">
            <button 
              onClick={() => {
                if (openAIService.isConfigured()) {
                  // Trigger AI analysis of current data
                  console.log('Analyzing data with AI...');
                } else {
                  alert('Please configure OpenAI API key to use AI analysis features.');
                }
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Brain className="w-4 h-4 mr-2" />
              AI Insights
            </button>
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Access Mode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue 2024</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processing Time 2024</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volume 2024</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.department_name.replace('Department of ', '')}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingData?.division || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, division: e.target.value } : null)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    ) : (
                      item.division
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingData?.license_permit_type || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, license_permit_type: e.target.value } : null)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    ) : (
                      <div className="truncate" title={item.license_permit_type}>
                        {item.license_permit_type}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                    {editingId === item.id ? (
                      <textarea
                        value={editingData?.description || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, description: e.target.value } : null)}
                        className="w-full px-2 py-1 border rounded text-xs"
                        rows={2}
                      />
                    ) : (
                      <div className="truncate" title={item.description}>
                        {item.description || 'N/A'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingData?.access_mode || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, access_mode: e.target.value } : null)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    ) : (
                      item.access_mode || 'N/A'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingData?.user_type || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, user_type: e.target.value } : null)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    ) : (
                      item.user_type || 'N/A'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingData?.cost || ''}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, cost: e.target.value } : null)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    ) : (
                      item.cost || 'N/A'
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editingData?.revenue_2024 || 0}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, revenue_2024: Number(e.target.value) } : null)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    ) : (
                      `$${item.revenue_2024.toLocaleString()}`
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editingData?.processing_time_2024 || 0}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, processing_time_2024: Number(e.target.value) } : null)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    ) : (
                      `${item.processing_time_2024} days`
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingId === item.id ? (
                      <input
                        type="number"
                        value={editingData?.volume_2024 || 0}
                        onChange={(e) => setEditingData(prev => prev ? { ...prev, volume_2024: Number(e.target.value) } : null)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                    ) : (
                      item.volume_2024.toLocaleString()
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingId === item.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSave}
                          className="text-green-600 hover:text-green-900"
                          disabled={loading}
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-red-600 hover:text-red-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {filteredData.length === 0 && !loading && (
        <div className="p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No inventory data available</h3>
          <p className="text-gray-500 mb-4">
            {filters.department_name || filters.division || filters.license_permit_type || searchTerm
              ? 'No data matches your current filters. Try adjusting your search criteria.'
              : 'Upload a spreadsheet to start tracking department inventory data.'
            }
          </p>
          {(filters.department_name || filters.division || filters.license_permit_type || searchTerm) && (
            <button
              onClick={() => {
                setFilters({ department_name: '', division: '', license_permit_type: '' });
                setSearchTerm('');
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DataGathering;