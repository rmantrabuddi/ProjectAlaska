import React, { useState } from 'react';
import { Plus, FileText, MessageSquare, StickyNote, Calendar, User, Briefcase, Tag, HelpCircle, Sparkles } from 'lucide-react';
import InterviewForm from './InterviewForm';
import { Department } from '../types';
import { enhanceContentWithAI, checkAPIKey } from '../services/openai';

interface ContentInputProps {
  departments: Department[];
  onAddContent: (content: any) => void;
  selectedDepartmentId?: number | null;
  onBackToOverview?: () => void;
}

const ContentInput: React.FC<ContentInputProps> = ({ 
  departments, 
  onAddContent, 
  selectedDepartmentId,
  onBackToOverview 
}) => {
  const [contentType, setContentType] = useState<'interview' | 'document' | 'note'>('interview');
  const [showInterviewForm, setShowInterviewForm] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    departmentId: selectedDepartmentId || 1,
    intervieweeName: '',
    intervieweeRole: '',
    date: new Date().toISOString().split('T')[0],
    tags: ''
  });

  const hasAPIKey = checkAPIKey();

  // Initialize with selected department
  React.useEffect(() => {
    if (selectedDepartmentId) {
      const department = departments.find(d => d.id === selectedDepartmentId);
      setSelectedDepartment(department || null);
      setFormData(prev => ({ ...prev, departmentId: selectedDepartmentId }));
    }
  }, [selectedDepartmentId, departments]);

  const handleDepartmentChange = (departmentId: number) => {
    const department = departments.find(d => d.id === departmentId);
    setSelectedDepartment(department || null);
    setFormData(prev => ({ ...prev, departmentId }));
  };

  const enhanceContent = async () => {
    if (!formData.content.trim() || !hasAPIKey) return;
    
    setIsEnhancing(true);
    try {
      const enhancedContent = await enhanceContentWithAI(formData.content, contentType);
      setFormData(prev => ({ ...prev, content: enhancedContent }));
    } catch (error) {
      console.error('Content enhancement failed:', error);
    }
    setIsEnhancing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }
    
    const contentItem = {
      type: contentType,
      title: formData.title,
      content: formData.content,
      departmentId: formData.departmentId,
      date: formData.date,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      ...(contentType === 'interview' && {
        intervieweeName: formData.intervieweeName,
        intervieweeRole: formData.intervieweeRole
      })
    };

    onAddContent(contentItem);
    
    // Reset form
    setFormData({
      title: '',
      content: '',
      departmentId: 1,
      intervieweeName: '',
      intervieweeRole: '',
      date: new Date().toISOString().split('T')[0],
      tags: ''
    });
    setSelectedDepartment(departments.find(d => d.id === 1) || null);
  };

  const handleInterviewSubmit = (interviewData: any) => {
    onAddContent(interviewData);
    setShowInterviewForm(false);
  };

  const contentTypes = [
    { id: 'interview', label: 'Structured Interview', icon: MessageSquare, color: 'bg-blue-100 text-blue-700' },
    { id: 'document', label: 'Document Upload', icon: FileText, color: 'bg-green-100 text-green-700' },
    { id: 'note', label: 'Notes Upload', icon: StickyNote, color: 'bg-purple-100 text-purple-700' }
  ];

  return (
    <div className="space-y-6">
      {/* Show Interview Form */}
      {showInterviewForm && contentType === 'interview' && (
        <InterviewForm
          departments={departments}
          selectedDepartmentId={formData.departmentId}
          onSubmit={handleInterviewSubmit}
          onCancel={() => setShowInterviewForm(false)}
        />
      )}

      {/* Show regular form when not in interview mode */}
      {!showInterviewForm && (
        <>
      {/* Back to Overview Button */}
      {selectedDepartmentId && onBackToOverview && (
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToOverview}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to State Overview</span>
          </button>
          {selectedDepartment && (
            <div className="text-slate-400">|</div>
          )}
          {selectedDepartment && (
            <div className="text-slate-700 font-medium">
              Adding content for {selectedDepartment.shortName}
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Content Input</h2>
        <p className="text-slate-600">
          {selectedDepartmentId 
            ? `Add content for ${selectedDepartment?.name || 'the selected department'}. Review the key questions below to guide your research.`
            : 'Add interview notes, documents, or manual observations. Each department has specific key questions to guide your research.'
          }
        </p>
      </div>

      {/* Department Selection with Key Questions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Select Department & Review Key Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Department
            </label>
            <select
              value={formData.departmentId}
              onChange={(e) => handleDepartmentChange(parseInt(e.target.value))}
              disabled={!!selectedDepartmentId}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.shortName}</option>
              ))}
            </select>
          </div>
          
          {selectedDepartment && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <HelpCircle className="w-4 h-4 inline mr-1" />
                Department Focus
              </label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-medium mb-2">{selectedDepartment.name}</p>
                <p className="text-xs text-blue-700">{selectedDepartment.description}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Key Questions Display */}
        {selectedDepartment && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold text-slate-800 mb-3 flex items-center">
              <HelpCircle className="w-4 h-4 mr-2 text-blue-600" />
              Key Research Questions for {selectedDepartment.shortName}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedDepartment.keyQuestions.slice(0, 6).map((question, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{question}</p>
                </div>
              ))}
            </div>
            {selectedDepartment.keyQuestions.length > 6 && (
              <p className="text-xs text-slate-500 mt-2 italic">
                +{selectedDepartment.keyQuestions.length - 6} more questions to explore...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Content Type Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Content Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contentTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setContentType(type.id as any)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  contentType === type.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg ${type.color} flex items-center justify-center mb-3 mx-auto`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-medium text-slate-800">{type.label}</h4>
              </button>
            );
          })}
        </div>
        
        {/* Structured Interview Button */}
        {contentType === 'interview' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Structured Interview (Recommended)</h4>
                <p className="text-sm text-blue-700">
                  Use our standardized 30-question interview format for comprehensive data collection
                </p>
              </div>
              <button
                onClick={() => setShowInterviewForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Start Structured Interview
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      {contentType !== 'interview' || !showInterviewForm ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              {contentType === 'interview' ? 'Quick Interview Entry' : 
               contentType === 'document' ? 'Document Upload' : 'Manual Note Entry'}
            </h3>
            {contentType === 'interview' && (
              <span className="text-sm text-slate-600 bg-yellow-100 px-3 py-1 rounded-full">
                Consider using Structured Interview for better results
              </span>
            )}
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder={
                contentType === 'interview' ? 'Interview with [Name] - [Topic]' :
                contentType === 'document' ? 'Document name or description' :
                'Brief description of the note'
              }
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>

          {/* Interview-specific fields */}
          {contentType === 'interview' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Interviewee Name
                </label>
                <input
                  type="text"
                  value={formData.intervieweeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, intervieweeName: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Interviewee Role
                </label>
                <input
                  type="text"
                  value={formData.intervieweeRole}
                  onChange={(e) => setFormData(prev => ({ ...prev, intervieweeRole: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Program Manager"
                  required
                />
              </div>
            </>
          )}

          {/* Tags */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="policy, budget, technology, stakeholder"
            />
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Content
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            rows={12}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
            placeholder={
              contentType === 'interview' ? 'Enter detailed interview notes, key quotes, and observations. Consider addressing the key questions shown above for this department.' :
              contentType === 'document' ? 'Enter document content, key excerpts, or summary. Focus on information relevant to the department\'s key questions.' :
              'Enter your manual notes and observations. Consider how they relate to the department\'s focus areas and key questions.'
            }
            required
          />
        </div>
        
        {/* AI Enhancement Button */}
        {hasAPIKey && formData.content.trim() && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={enhanceContent}
              disabled={isEnhancing}
              className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isEnhancing ? 'Enhancing...' : 'Enhance with AI'}</span>
            </button>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Content</span>
        </button>
        </form>
      ) : null}
        </>
      )}
    </div>
  );
};

export default ContentInput;