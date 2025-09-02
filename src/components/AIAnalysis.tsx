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
                <p>• <strong>Optional:</strong> description, access_mode, regulations, user_type, cost</p>
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