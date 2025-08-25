import React, { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { DatabaseService, Department, ensureAuth, supabase } from '../lib/supabase';
import { openAIServiceExtended, AIAnalysisResultLike } from '../services/openai';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface InterviewUploadProps {}

const InterviewUpload: React.FC<InterviewUploadProps> = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    department_id: '',
    department_name: '',
    division: '',
    interview_date: '',
    duration_minutes: 0,
    interviewee_name: '',
    interviewer_name: ''
  });
  const [file, setFile] = useState<File | null>(null);
  const [rawNotes, setRawNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResultLike | null>(null);
  const [showJsonDetails, setShowJsonDetails] = useState(false);

  // Load departments on mount
  React.useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const depts = await DatabaseService.getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDept = departments.find(d => d.id === e.target.value);
    setFormData({
      ...formData,
      department_id: e.target.value,
      department_name: selectedDept?.name || ''
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    // Validate file size (10MB max)
    if (uploadedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['.txt', '.md', '.docx', '.pdf'];
    const fileExtension = '.' + uploadedFile.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      setError('Please upload a .txt, .md, .docx, or .pdf file');
      return;
    }

    setFile(uploadedFile);
    setError(null);
    setLoadingStep('Parsing...');
    setLoading(true);

    try {
      const text = await parseFile(uploadedFile);
      const truncatedText = text.length > 25000 
        ? text.substring(0, 25000) + '\n\n[Note: Content truncated at 25,000 characters]'
        : text;
      
      setRawNotes(truncatedText);
    } catch (err) {
      setError(`Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setRawNotes(''); // Allow manual paste as fallback
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const parseFile = async (file: File): Promise<string> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    switch (fileExtension) {
      case 'txt':
      case 'md':
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('Failed to read text file'));
          reader.readAsText(file);
        });

      case 'docx':
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              const result = await mammoth.extractRawText({ arrayBuffer });
              resolve(result.value);
            } catch (error) {
              reject(new Error('Failed to parse DOCX file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read DOCX file'));
          reader.readAsArrayBuffer(file);
        });

      case 'pdf':
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              let text = '';
              
              // Extract text from first 10 pages max
              const maxPages = Math.min(pdf.numPages, 10);
              for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                  .map((item: any) => item.str)
                  .join(' ');
                text += pageText + '\n';
              }
              
              if (text.trim()) {
                resolve(text);
              } else {
                reject(new Error('No text could be extracted from PDF'));
              }
            } catch (error) {
              reject(new Error('Failed to parse PDF file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read PDF file'));
          reader.readAsArrayBuffer(file);
        });

      default:
        throw new Error('Unsupported file type');
    }
  };

  const computeHash = async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.department_id || !formData.interview_date || !rawNotes.trim()) {
      setError('Please fill in all required fields (Department, Interview Date) and ensure notes are available');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    setAnalysisResult(null);

    try {
      await ensureAuth();

      // Step 1: Compute hash
      setLoadingStep('Computing hash...');
      const sourceDataHash = await computeHash(rawNotes);

      // Step 2: AI Analysis
      setLoadingStep('Analyzing with AI...');
      const aiResult = await openAIServiceExtended.analyzeInterviewNotesToJson(rawNotes, {
        department_name: formData.department_name,
        division: formData.division,
        interview_date: formData.interview_date,
        duration_minutes: formData.duration_minutes,
        interviewee_name: formData.interviewee_name,
        interviewer_name: formData.interviewer_name,
        document_name: file?.name || 'manual_entry',
        source_data_hash: sourceDataHash
      });

      // Step 3: Upload file to Supabase Storage (if file exists)
      let fileUrl = null;
      if (file && supabase) {
        setLoadingStep('Uploading file...');
        const timestamp = Date.now();
        const date = new Date().toISOString().split('T')[0];
        const fileName = `${date}_${timestamp}_${slugify(file.name)}`;
        const filePath = `${slugify(formData.department_name)}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('interview-notes')
          .upload(filePath, file);

        if (uploadError) {
          if (uploadError.message.includes('not found')) {
            throw new Error('Create a Storage bucket "interview-notes" (public) in Supabase.');
          }
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('interview-notes')
          .getPublicUrl(filePath);
        
        fileUrl = urlData.publicUrl;
      }

      // Step 4: Save to interview_notes table
      setLoadingStep('Saving interview notes...');
      const interviewNote = await DatabaseService.createInterviewNote({
        department_id: formData.department_id,
        department_name: formData.department_name,
        division: formData.division,
        interviewee_name: formData.interviewee_name || '',
        interviewer_name: formData.interviewer_name || '',
        interview_date: formData.interview_date,
        duration_minutes: formData.duration_minutes,
        notes: rawNotes,
        key_insights: aiResult.key_insights,
        challenges: aiResult.challenges,
        opportunities: aiResult.opportunities,
        status: 'Active'
      });

      // Step 5: Save AI analysis results
      setLoadingStep('Saving AI analysis...');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await DatabaseService.saveAIAnalysis({
        analysis_type: 'interview_analysis',
        department_name: formData.department_name,
        source_data_hash: sourceDataHash,
        summary: aiResult.summary,
        key_insights: aiResult.key_insights,
        challenges: aiResult.challenges,
        opportunities: aiResult.opportunities,
        recommendations: aiResult.recommendations,
        confidence_score: aiResult.confidence_score,
        expires_at: expiresAt.toISOString()
      });

      setAnalysisResult(aiResult);
      setSuccess(true);
      
      // Reset form
      setFormData({
        department_id: '',
        department_name: '',
        division: '',
        interview_date: '',
        duration_minutes: 0,
        interviewee_name: '',
        interviewer_name: ''
      });
      setFile(null);
      setRawNotes('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during processing');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 text-sm mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {success && analysisResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            <h3 className="text-lg font-semibold text-green-900">Analysis Complete!</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-green-900 mb-2">Summary</h4>
              <p className="text-green-800 text-sm">{analysisResult.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-green-900 mb-2">Key Insights ({analysisResult.key_insights.length})</h4>
                <ul className="text-green-800 text-sm space-y-1">
                  {analysisResult.key_insights.map((insight, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-green-900 mb-2">Challenges ({analysisResult.challenges.length})</h4>
                <ul className="text-green-800 text-sm space-y-1">
                  {analysisResult.challenges.map((challenge, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      {challenge}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-green-900 mb-2">Opportunities ({analysisResult.opportunities.length})</h4>
                <ul className="text-green-800 text-sm space-y-1">
                  {analysisResult.opportunities.map((opportunity, i) => (
                    <li key={i} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      {opportunity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <button
                onClick={() => setShowJsonDetails(!showJsonDetails)}
                className="flex items-center text-green-700 hover:text-green-900 text-sm"
              >
                {showJsonDetails ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {showJsonDetails ? 'Hide' : 'View'} JSON Details
              </button>
              
              {showJsonDetails && (
                <pre className="mt-3 bg-green-100 p-3 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(analysisResult, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.department_id}
              onChange={handleDepartmentChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Division
            </label>
            <input
              type="text"
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interview Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.interview_date}
              onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interviewee Name
            </label>
            <input
              type="text"
              value={formData.interviewee_name}
              onChange={(e) => setFormData({ ...formData, interviewee_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interviewer Name
            </label>
            <input
              type="text"
              value={formData.interviewer_name}
              onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Interview Document
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
                Click to upload
              </span>
              <p className="text-gray-500 mt-1">or drag and drop</p>
              <p className="text-sm text-gray-400 mt-1">
                Supports .txt, .md, .docx, .pdf (max 10MB)
              </p>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".txt,.md,.docx,.pdf"
                onChange={handleFileUpload}
                disabled={loading}
              />
            </label>
            
            {file && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <FileText className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-700">{file.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Raw Notes Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Raw Notes (preview) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            rows={8}
            required
            placeholder="Upload a file above or paste interview notes here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading && loadingStep === 'Parsing...'}
          />
          {rawNotes.includes('[Note: Content truncated') && (
            <p className="text-sm text-yellow-600 mt-1">
              Content was truncated at 25,000 characters for processing efficiency.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !rawNotes.trim()}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {loadingStep || 'Processing...'}
              </>
            ) : (
              'Save & Analyze'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InterviewUpload;