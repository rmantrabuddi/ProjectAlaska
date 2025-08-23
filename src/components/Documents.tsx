import React, { useState } from 'react';
import { Upload, FileText, Download, Trash2, Eye, Brain } from 'lucide-react';
import { DatabaseService, Document, Department, isSupabaseConfigured } from '../lib/supabase';
import { openAIService } from '../services/openai';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
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
        setDocuments([]);
        return;
      }

      const [departmentsData, documentsData] = await Promise.all([
        DatabaseService.getDepartments(),
        DatabaseService.getDocuments()
      ]);
      setDepartments(departmentsData);
      setDocuments(documentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents. Please check your database connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && selectedDepartment) {
      setLoading(true);
      try {
        const selectedDept = departments.find(d => d.name === selectedDepartment);
        if (!selectedDept) throw new Error('Department not found');

        const uploadPromises = Array.from(files).map(async (file) => {
          const newDoc = {
            department_id: selectedDept.id,
            department_name: selectedDepartment,
            file_name: file.name,
            file_type: getDocumentType(file.name),
            file_size: file.size,
            document_type: getDocumentType(file.name),
            description: '',
            upload_date: new Date().toISOString(),
            uploaded_by: 'Current User',
            status: 'Active' as const
          };
          return DatabaseService.createDocument(newDoc);
        });

        const savedDocs = await Promise.all(uploadPromises);
        setDocuments(prev => [...prev, ...savedDocs]);
        alert(`${savedDocs.length} document(s) uploaded successfully!`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload documents');
      } finally {
        setLoading(false);
      }
      // Reset file input
      event.target.value = '';
    } else if (!selectedDepartment) {
      alert('Please select a department before uploading documents.');
    }
  };

  const getDocumentType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'PDF Document';
      case 'doc':
      case 'docx': return 'Word Document';
      case 'xls':
      case 'xlsx': return 'Excel Spreadsheet';
      case 'ppt':
      case 'pptx': return 'PowerPoint Presentation';
      default: return 'Document';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await DatabaseService.deleteDocument(id);
        setDocuments(prev => prev.filter(doc => doc.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete document');
      }
    }
  };

  const filteredDocuments = selectedDepartment 
    ? documents.filter(doc => doc.department_name === selectedDepartment)
    : documents;

  const groupedDocuments = filteredDocuments.reduce((groups, doc) => {
    const dept = doc.department_name;
    if (!groups[dept]) {
      groups[dept] = [];
    }
    groups[dept].push(doc);
    return groups;
  }, {} as Record<string, Document[]>);

  if (loading && documents.length === 0) {
    return <div className="flex justify-center items-center h-64">
      <div className="text-lg">Loading documents...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 text-sm mt-2">Dismiss</button>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Department Documents</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Department</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a department...</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <label htmlFor="document-upload" className="cursor-pointer">
            <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
              Click to upload documents
            </span>
            <p className="text-gray-500 mt-2">or drag and drop your files here</p>
            <p className="text-sm text-gray-400 mt-1">Supports PDF, Word, Excel, PowerPoint files</p>
            <input
              id="document-upload"
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter Documents</h3>
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department Filter</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 self-end pb-2">
            Showing {filteredDocuments.length} documents
          </div>
        </div>
      </div>

      {/* Documents Display */}
      <div className="space-y-6">
        {Object.entries(groupedDocuments).map(([department, docs]) => (
          <div key={department} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900">
                {department.replace('Department of ', '')}
              </h3>
              <p className="text-sm text-blue-700">{docs.length} documents</p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {docs.map((doc) => (
                <div key={doc.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-8 h-8 text-blue-500" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{doc.file_name}</h4>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>{doc.file_type}</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>Uploaded: {new Date(doc.upload_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={async () => {
                          if (openAIService.isConfigured()) {
                            try {
                              // In a real app, you'd extract text from the document
                              const mockDocumentText = `Document: ${doc.file_name}\nType: ${doc.file_type}\nDepartment: ${doc.department_name}`;
                              const analysis = await openAIService.analyzeDocument(mockDocumentText, doc.file_name);
                              alert(`AI Analysis:\n\nSummary: ${analysis.summary}\n\nKey Points:\n${analysis.keyPoints.join('\n')}`);
                            } catch (error) {
                              alert('Error analyzing document: ' + (error as Error).message);
                            }
                          } else {
                            alert('Please configure OpenAI API key to use AI analysis features.');
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                        title="AI Analysis"
                      >
                        <Brain className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View Document"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                        title="Download Document"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-500">
            {selectedDepartment 
              ? `No documents have been uploaded for ${selectedDepartment}. Select a department and upload documents to get started.`
              : 'No documents have been uploaded yet. Select a department and upload documents to get started.'
            }
          </p>
          {selectedDepartment && (
            <button
              onClick={() => setSelectedDepartment('')}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
            >
              View all departments
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Documents;