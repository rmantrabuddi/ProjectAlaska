import React, { useState, useEffect } from 'react';
import { Upload, Search, Filter, Edit2, Save, X, Plus, Download, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { inventoryService, InventoryMasterRecord } from '../services/supabase';
import { parseFile, mapCSVToInventoryRecord, validateInventoryRecord } from '../utils/csvParser';

const InventoryMaster: React.FC = () => {
  const [records, setRecords] = useState<InventoryMasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Filter options
  const [departments, setDepartments] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  
  // Edit state
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<InventoryMasterRecord>>({});
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  useEffect(() => {
    loadData();
    loadFilterOptions();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getAll({
        department: departmentFilter || undefined,
        division: divisionFilter || undefined,
        status: statusFilter || undefined,
        search: searchTerm || undefined
      });
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [depts, divs] = await Promise.all([
        inventoryService.getUniqueValues('department'),
        inventoryService.getUniqueValues('division')
      ]);
      setDepartments(depts);
      setDivisions(divs);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, departmentFilter, divisionFilter, statusFilter]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress('Reading file...');
    setError(null);

    try {
      setUploadProgress('Parsing file data...');
      
      const csvRows = await parseFile(file);
      const validRecords: Omit<InventoryMasterRecord, 'id' | 'created_at' | 'updated_at'>[] = [];
      const errors: string[] = [];

      setUploadProgress('Validating records...');
      
      csvRows.forEach((row, index) => {
        // Skip empty rows
        if (!row['Department'] && !row['License Permit Title']) return;
        
        const record = mapCSVToInventoryRecord(row);
        const recordErrors = validateInventoryRecord(record);
        
        if (recordErrors.length > 0) {
          errors.push(`Row ${index + 2}: ${recordErrors.join(', ')}`);
        } else {
          validRecords.push(record);
        }
      });

      if (errors.length > 0) {
        setError(`Validation errors found:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : ''}`);
        setUploading(false);
        return;
      }

      if (validRecords.length === 0) {
        setError('No valid records found in the file');
        setUploading(false);
        return;
      }

      setUploadProgress(`Uploading ${validRecords.length} records...`);
      
      // Clear existing data before inserting new records
      setUploadProgress('Clearing existing data...');
      await inventoryService.clearAll();
      
      await inventoryService.bulkInsert(validRecords);
      
      setSuccess(`Successfully uploaded ${validRecords.length} records`);
      setUploadProgress('Refreshing data...');
      await loadData();
      await loadFilterOptions();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress('');
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleEdit = (record: InventoryMasterRecord) => {
    setEditingRow(record.id);
    setEditData(record);
  };

  const handleSave = async () => {
    if (!editingRow || !editData) return;

    try {
      await inventoryService.update(editingRow, editData);
      setSuccess('Record updated successfully');
      await loadData();
      setEditingRow(null);
      setEditData({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update record');
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      await inventoryService.delete(id);
      setSuccess('Record deleted successfully');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete record');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'Department', 'Division', 'License Permit Title', 'Type', 'Approving Entities',
      'Access Mode', 'Key Word', 'Description', 'Regulations', 'Regulation Description',
      'User Type', 'Cost', 'Renewal Frequency', 'Source', '2022 Revenue', '2023 Revenue',
      '2024 Revenue', '2022 Volume', '2023 Volume', '2024 Volume', '2022 Processing Time',
      '2023 Processing Time', '2024 Processing Time', 'Digitized', '% workflow automated',
      'Notes', 'Status', 'Created At', 'Updated At'
    ];

    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.record_id, record.department, record.division, record.license_permit_title,
        record.type, record.approving_entities, record.access_mode, record.key_word,
        record.description, record.regulations, record.regulation_description,
        record.user_type, record.cost, record.renewal_frequency, record.source,
        record.revenue_2022, record.revenue_2023, record.revenue_2024,
        record.volume_2022, record.volume_2023, record.volume_2024,
        record.processing_time_2022, record.processing_time_2023, record.processing_time_2024,
        record.digitized, record.workflow_automated_percent, record.notes, record.status,
        record.created_at, record.updated_at
      ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-master-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Inventory Master</h2>
          <p className="text-slate-600">Manage the complete Alaska license and permit inventory database</p>
        </div>
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-slate-600">{records.length} records</span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error</h3>
            <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900">Success</h3>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Upload Inventory Data</h3>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <div className="space-y-2">
                <p className="text-slate-600 font-medium">Upload CSV File</p>
                <p className="text-sm text-slate-500">
                  Upload a CSV file matching the Alaska inventory template format
                </p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className={`inline-block px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    uploading
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Choose File'}
                </label>
                <p className="text-xs text-slate-500">
                  Supported formats: CSV (.csv), Excel (.xlsx, .xls)
                </p>
              </div>
            </div>
            {uploadProgress && (
              <div className="mt-3 text-sm text-blue-600 font-medium">
                {uploadProgress}
              </div>
            )}
          </div>
          <div className="ml-6">
            <button
              onClick={exportToCSV}
              disabled={records.length === 0}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records..."
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
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Division Filter */}
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
          >
            <option value="">All Divisions</option>
            {divisions.map(division => (
              <option key={division} value={division}>{division}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Under Review">Under Review</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Inventory Records</h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Loading records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No records found</h3>
            <p className="text-slate-600">Upload a CSV file to get started or adjust your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Record ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Department</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Division</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">License/Permit Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Cost</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs">{record.record_id}</td>
                    <td className="py-3 px-4 text-slate-600">{record.department}</td>
                    <td className="py-3 px-4 text-slate-600">{record.division}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {editingRow === record.id ? (
                        <input
                          type="text"
                          value={editData.license_permit_title || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, license_permit_title: e.target.value }))}
                          className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                        />
                      ) : (
                        <span className="line-clamp-2">{record.license_permit_title}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{record.type}</td>
                    <td className="py-3 px-4 text-slate-600">{record.cost}</td>
                    <td className="py-3 px-4">
                      {editingRow === record.id ? (
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
                          record.status === 'Active' ? 'bg-green-100 text-green-700' :
                          record.status === 'Inactive' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {record.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingRow === record.id ? (
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
                          onClick={() => handleEdit(record)}
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
        )}
      </div>
    </div>
  );
};

export default InventoryMaster;