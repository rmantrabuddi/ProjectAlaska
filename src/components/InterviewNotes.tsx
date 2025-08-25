import React, { useState } from 'react';
import { Plus, MessageSquare, Calendar, User, FileText, Search, Filter, Brain, Upload, Loader2, FileCheck } from 'lucide-react';
import { DatabaseService, InterviewNote, Department, isSupabaseConfigured } from '../lib/supabase';
import { openAIService } from '../services/openai';

const InterviewNotes: React.FC = () => {
  const [notes, setNotes] = useState<InterviewNote[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<InterviewNote[]>(notes);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    department_name: '',
    division: '',
    searchTerm: ''
  });

  const [newNote, setNewNote] = useState<Partial<InterviewNote>>({
    department_name: '',
    division: '',
    interviewee_name: '',
    interviewer_name: '',
    interview_date: '',
    duration_minutes: 0,
    notes: '',
    key_insights: [],
    challenges: [],
    opportunities: []
  });

  const [currentInsight, setCurrentInsight] = useState('');
  const [currentChallenge, setCurrentChallenge] = useState('');
  const [currentOpportunity, setCurrentOpportunity] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractingContent, setExtractingContent] = useState(false);
  const [uploadMode, setUploadMode] = useState<'manual' | 'upload'>('manual');

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
        setNotes([]);
        setFilteredNotes([]);
        return;
      }

      const [departmentsData, notesData] = await Promise.all([
        DatabaseService.getDepartments(),
        DatabaseService.getInterviewNotes()
      ]);
      setDepartments(departmentsData);
      setNotes(notesData);
      setFilteredNotes(notesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interview notes. Please check your database connection.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    let filtered = notes;

    if (filters.department_name) {
      filtered = filtered.filter(note => note.department_name === filters.department_name);
    }
    if (filters.division) {
      filtered = filtered.filter(note => note.division.toLowerCase().includes(filters.division.toLowerCase()));
    }
    if (filters.searchTerm) {
      filtered = filtered.filter(note =>
        note.notes.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        note.interviewee_name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        note.key_insights.some(insight => insight.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        note.challenges.some(challenge => challenge.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        note.opportunities.some(opportunity => opportunity.toLowerCase().includes(filters.searchTerm.toLowerCase()))
      );
    }

    setFilteredNotes(filtered);
  }, [filters, notes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedDept = departments.find(d => d.name === newNote.department_name);
    if (!selectedDept) {
      setError('Please select a valid department');
      return;
    }

    const noteToAdd = {
      department_id: selectedDept.id,
      department_name: newNote.department_name || '',
      division: newNote.division || '',
      interviewee_name: newNote.interviewee_name || '',
      interviewer_name: newNote.interviewer_name || '',
      interview_date: newNote.interview_date || '',
      duration_minutes: newNote.duration_minutes || 0,
      notes: newNote.notes || '',
      key_insights: newNote.key_insights || [],
      challenges: newNote.challenges || [],
      opportunities: newNote.opportunities || [],
      status: 'Active' as const
    };

    try {
      const savedNote = await DatabaseService.createInterviewNote(noteToAdd);
      setNotes(prev => [savedNote, ...prev]);
      setFilteredNotes(prev => [savedNote, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save interview note');
      return;
    }

    setNewNote({
      department_name: '',
      division: '',
      interviewee_name: '',
      interviewer_name: '',
      interview_date: '',
      duration_minutes: 0,
      notes: '',
      key_insights: [],
      challenges: [],
      opportunities: []
    });
    setShowAddForm(false);
  };

  const addInsight = () => {
    if (currentInsight.trim()) {
      setNewNote(prev => ({
        ...prev,
        key_insights: [...(prev.key_insights || []), currentInsight.trim()]
      }));
      setCurrentInsight('');
    }
  };

  const addChallenge = () => {
    if (currentChallenge.trim()) {
      setNewNote(prev => ({
        ...prev,
        challenges: [...(prev.challenges || []), currentChallenge.trim()]
      }));
      setCurrentChallenge('');
    }
  };

  const addOpportunity = () => {
    if (currentOpportunity.trim()) {
      setNewNote(prev => ({
        ...prev,
        opportunities: [...(prev.opportunities || []), currentOpportunity.trim()]
      }));
      setCurrentOpportunity('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      await extractContentFromFile(file);
    }
  };

  const extractContentFromFile = async (file: File) => {
    if (!openAIService.isConfigured()) {
      setError('OpenAI API key not configured. Please add your API key to enable document analysis.');
      return;
    }

    setExtractingContent(true);
    setError(null);

    try {
      // Read file content
      const fileContent = await readFileContent(file);
      
      // Use AI to extract structured information
      const extractedData = await extractInterviewData(fileContent, file.name);
      
      // Update the form with extracted data
      setNewNote(prev => ({
        ...prev,
        notes: extractedData.notes,
        key_insights: extractedData.keyInsights,
        challenges: extractedData.challenges,
        opportunities: extractedData.opportunities,
        duration_minutes: extractedData.duration || prev.duration_minutes
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract content from document');
    } finally {
      setExtractingContent(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      // Handle different file types
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'txt' || fileExtension === 'md') {
        reader.readAsText(file);
      } else {
        // For other file types, read as text (basic support)
        reader.readAsText(file);
      }
    });
  };

  const extractInterviewData = async (content: string, fileName: string) => {
    const prompt = `
    Analyze the following interview document and extract structured information:
    
    Document: ${fileName}
    Content: ${content}
    
    Please extract and return a JSON object with the following structure:
    {
      "notes": "Comprehensive summary of the interview content",
      "keyInsights": ["insight 1", "insight 2", ...],
      "challenges": ["challenge 1", "challenge 2", ...],
      "opportunities": ["opportunity 1", "opportunity 2", ...],
      "duration": estimated_duration_in_minutes_or_null
    }
    
    Focus on:
    - Key insights about department operations, processes, or systems
    - Challenges or pain points mentioned
    - Opportunities for improvement or optimization
    - Any specific issues with licensing, permits, or regulatory processes
    `;

    try {
      const response = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert analyst specializing in government operations and interview analysis. Extract structured information from interview documents.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${errorData.detail || response.statusText || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Error extracting interview data:', error);
      throw error;
    }
  };

  const aggregatedInsights = notes.reduce((acc, note) => {
    acc.insights.push(...note.key_insights);
    acc.challenges.push(...note.challenges);
    acc.opportunities.push(...note.opportunities);
    return acc;
  }, { insights: [] as string[], challenges: [] as string[], opportunities: [] as string[] });

  const departmentStats = departments.map(dept => {
    const deptNotes = notes.filter(note => note.department_name === dept.name);
    return {
      department: dept.short_name,
      interviewCount: deptNotes.length,
      totalDuration: deptNotes.reduce((sum, note) => sum + note.duration_minutes, 0),
      lastInterview: deptNotes.length > 0 ? Math.max(...deptNotes.map(note => new Date(note.interview_date).getTime())) : null
    };
  });

  if (loading && notes.length === 0) {
    return <div className="flex justify-center items-center h-64">
      <div className="text-lg">Loading interview notes...</div>
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

      {/* Summary Dashboard */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Interview Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Key Insights</h3>
            <p className="text-2xl font-bold text-blue-600">{aggregatedInsights.insights.length}</p>
            <p className="text-sm text-blue-700">Identified across all interviews</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Challenges</h3>
            <p className="text-2xl font-bold text-yellow-600">{aggregatedInsights.challenges.length}</p>
            <p className="text-sm text-yellow-700">Areas needing attention</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Opportunities</h3>
            <p className="text-2xl font-bold text-green-600">{aggregatedInsights.opportunities.length}</p>
            <p className="text-sm text-green-700">Potential improvements</p>
          </div>
        </div>

        {/* Department Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {departmentStats.map((stat, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-3 text-center">
              <h4 className="text-sm font-medium text-gray-900">{stat.department}</h4>
              <p className="text-lg font-bold text-gray-600">{stat.interviewCount}</p>
              <p className="text-xs text-gray-500">interviews</p>
              {stat.totalDuration > 0 && (
                <p className="text-xs text-gray-500">{stat.totalDuration} min total</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add New Interview Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Interview Notes</h2>
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              if (openAIService.isConfigured() && notes.length > 0) {
                try {
                  const allNotes = notes.map(note => note.notes);
                  const analysis = await openAIService.analyzeInterviewNotes(allNotes);
                  alert(`AI Analysis Summary:\n\n${analysis.summary}\n\nKey Insights:\n${analysis.keyInsights.join('\n')}\n\nChallenges:\n${analysis.challenges.join('\n')}\n\nOpportunities:\n${analysis.opportunities.join('\n')}`);
                } catch (error) {
                  alert('Error analyzing interviews: ' + (error as Error).message);
                }
              } else if (!openAIService.isConfigured()) {
                alert('Please configure OpenAI API key to use AI analysis features.');
              } else {
                alert('No interview notes available for analysis.');
              }
            }}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Brain className="w-5 h-5 mr-2" />
            AI Analysis
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Interview Notes
          </button>
        </div>
      </div>

      {/* Add Interview Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Interview Notes</h3>
          
          {/* Upload Mode Toggle */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <button
                type="button"
                onClick={() => setUploadMode('manual')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  uploadMode === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('upload')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  uploadMode === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Upload Document
              </button>
            </div>

            {/* Document Upload Section */}
            {uploadMode === 'upload' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors mb-6">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <label htmlFor="interview-document-upload" className="cursor-pointer">
                  <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
                    Upload Interview Document
                  </span>
                  <p className="text-gray-500 mt-2">
                    Upload a text file (.txt, .md) containing interview notes
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    AI will automatically extract insights, challenges, and opportunities
                  </p>
                  <input
                    id="interview-document-upload"
                    type="file"
                    className="hidden"
                    accept=".txt,.md,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                </label>
                
                {uploadedFile && (
                  <div className="mt-4 flex items-center justify-center space-x-2">
                    <FileCheck className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700">
                      Uploaded: {uploadedFile.name}
                    </span>
                  </div>
                )}
                
                {extractingContent && (
                  <div className="mt-4 flex items-center justify-center space-x-2">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-700">
                      Extracting content with AI...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <select
                  value={newNote.department_name}
                  onChange={(e) => setNewNote({ ...newNote, department_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
                <input
                  type="text"
                  value={newNote.division}
                  onChange={(e) => setNewNote({ ...newNote, division: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interviewee</label>
                <input
                  type="text"
                  value={newNote.interviewee_name}
                  onChange={(e) => setNewNote({ ...newNote, interviewee_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Interviewer</label>
                <input
                  type="text"
                  value={newNote.interviewer_name}
                  onChange={(e) => setNewNote({ ...newNote, interviewer_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={newNote.interview_date}
                  onChange={(e) => setNewNote({ ...newNote, interview_date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={newNote.duration_minutes}
                  onChange={(e) => setNewNote({ ...newNote, duration_minutes: Number(e.target.value) })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interview Notes</label>
              <textarea
                value={newNote.notes}
                onChange={(e) => setNewNote({ ...newNote, notes: e.target.value })}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={uploadMode === 'upload' ? 'Content will be automatically extracted from uploaded document...' : 'Enter detailed interview notes...'}
                disabled={extractingContent}
              />
            </div>

            {/* Key Insights */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Key Insights</label>
              {uploadMode === 'upload' && newNote.key_insights && newNote.key_insights.length > 0 && (
                <p className="text-sm text-green-600 mb-2">✓ Automatically extracted from document</p>
              )}
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={currentInsight}
                  onChange={(e) => setCurrentInsight(e.target.value)}
                  placeholder="Add an insight"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={extractingContent}
                />
                <button
                  type="button"
                  onClick={addInsight}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={extractingContent}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newNote.key_insights?.map((insight, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
                    {insight}
                    <button
                      type="button"
                      onClick={() => setNewNote(prev => ({
                        ...prev,
                        key_insights: prev.key_insights?.filter((_, i) => i !== index) || []
                      }))}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Challenges */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Challenges</label>
              {uploadMode === 'upload' && newNote.challenges && newNote.challenges.length > 0 && (
                <p className="text-sm text-green-600 mb-2">✓ Automatically extracted from document</p>
              )}
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={currentChallenge}
                  onChange={(e) => setCurrentChallenge(e.target.value)}
                  placeholder="Add a challenge"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={extractingContent}
                />
                <button
                  type="button"
                  onClick={addChallenge}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  disabled={extractingContent}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newNote.challenges?.map((challenge, index) => (
                  <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm flex items-center">
                    {challenge}
                    <button
                      type="button"
                      onClick={() => setNewNote(prev => ({
                        ...prev,
                        challenges: prev.challenges?.filter((_, i) => i !== index) || []
                      }))}
                      className="ml-2 text-yellow-600 hover:text-yellow-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Opportunities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Opportunities</label>
              {uploadMode === 'upload' && newNote.opportunities && newNote.opportunities.length > 0 && (
                <p className="text-sm text-green-600 mb-2">✓ Automatically extracted from document</p>
              )}
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={currentOpportunity}
                  onChange={(e) => setCurrentOpportunity(e.target.value)}
                  placeholder="Add an opportunity"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={extractingContent}
                />
                <button
                  type="button"
                  onClick={addOpportunity}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  disabled={extractingContent}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newNote.opportunities?.map((opportunity, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
                    {opportunity}
                    <button
                      type="button"
                      onClick={() => setNewNote(prev => ({
                        ...prev,
                        opportunities: prev.opportunities?.filter((_, i) => i !== index) || []
                      }))}
                      className="ml-2 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={extractingContent}
              >
                {extractingContent ? 'Processing...' : 'Save Interview Notes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filter Interview Notes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                placeholder="Search notes, insights..."
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interview Notes List */}
      <div className="space-y-4">
        {filteredNotes.map((note) => (
          <div key={note.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    {note.department_name.replace('Department of ', '')} - {note.division}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-blue-700 mt-1">
                    <span className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {note.interviewee_name}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(note.interview_date).toLocaleDateString()}
                    </span>
                    <span>{note.duration_minutes} minutes</span>
                  </div>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Interview Notes</h4>
                <p className="text-gray-700">{note.notes}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Key Insights</h5>
                  <div className="space-y-2">
                    {note.key_insights.map((insight, index) => (
                      <span key={index} className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm mr-2 mb-2">
                        {insight}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-yellow-900 mb-2">Challenges</h5>
                  <div className="space-y-2">
                    {note.challenges.map((challenge, index) => (
                      <span key={index} className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm mr-2 mb-2">
                        {challenge}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-green-900 mb-2">Opportunities</h5>
                  <div className="space-y-2">
                    {note.opportunities.map((opportunity, index) => (
                      <span key={index} className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm mr-2 mb-2">
                        {opportunity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No interview notes found</h3>
          <p className="text-gray-500">
            {filters.department_name || filters.division || filters.searchTerm
              ? 'No interview notes match your current filters. Try adjusting your search criteria or add new interview notes.'
              : 'No interview notes have been added yet. Click "Add Interview Notes" to start documenting insights and opportunities.'
            }
          </p>
          {(filters.department_name || filters.division || filters.searchTerm) && (
            <button
              onClick={() => setFilters({ department_name: '', division: '', searchTerm: '' })}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewNotes;