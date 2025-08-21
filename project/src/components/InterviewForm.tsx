import React, { useState } from 'react';
import { User, Briefcase, Calendar, Save, ChevronDown, ChevronUp, MessageSquare, Sparkles, Lightbulb } from 'lucide-react';
import { STANDARD_INTERVIEW_QUESTIONS, QUESTION_CATEGORIES } from '../data/standardQuestions';
import { Department } from '../types';
import { generateInterviewQuestions, checkAPIKey } from '../services/openai';

interface InterviewFormProps {
  departments: Department[];
  selectedDepartmentId: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const InterviewForm: React.FC<InterviewFormProps> = ({ 
  departments, 
  selectedDepartmentId, 
  onSubmit, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    intervieweeName: '',
    intervieweeRole: '',
    date: new Date().toISOString().split('T')[0],
    tags: '',
    interviewAnswers: {} as { [key: string]: string }
  });

  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({
    licensing: true,
    processes: false,
    challenges: false,
    staffing: false,
    initiatives: false,
    technology: false,
    compliance: false,
    revenue: false
  });

  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const hasAPIKey = checkAPIKey();

  const handleAnswerChange = (questionId: string, answer: string) => {
    setFormData(prev => ({
      ...prev,
      interviewAnswers: {
        ...prev.interviewAnswers,
        [questionId]: answer
      }
    }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const generateCustomQuestions = async () => {
    const department = departments.find(d => d.id === selectedDepartmentId);
    if (!department || !hasAPIKey) return;

    setIsGeneratingQuestions(true);
    try {
      const questions = await generateInterviewQuestions(department.name, department.description);
      setCustomQuestions(questions);
    } catch (error) {
      console.error('Failed to generate custom questions:', error);
    }
    setIsGeneratingQuestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate content from answered questions
    const answeredQuestions = Object.entries(formData.interviewAnswers)
      .filter(([_, answer]) => answer.trim())
      .map(([questionId, answer]) => {
        const question = STANDARD_INTERVIEW_QUESTIONS.find(q => q.id === questionId);
        return `Q: ${question?.question}\nA: ${answer}`;
      })
      .join('\n\n');

    const contentItem = {
      type: 'interview' as const,
      title: formData.title,
      content: answeredQuestions,
      departmentId: selectedDepartmentId,
      date: formData.date,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      intervieweeName: formData.intervieweeName,
      intervieweeRole: formData.intervieweeRole,
      interviewAnswers: formData.interviewAnswers
    };

    onSubmit(contentItem);
  };

  const getAnsweredCount = (category: string) => {
    const categoryQuestions = STANDARD_INTERVIEW_QUESTIONS.filter(q => q.category === category);
    const answeredCount = categoryQuestions.filter(q => 
      formData.interviewAnswers[q.id]?.trim()
    ).length;
    return `${answeredCount}/${categoryQuestions.length}`;
  };

  const selectedDepartment = departments.find(d => d.id === selectedDepartmentId);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Structured Interview Form</h3>
            <p className="text-slate-600">
              Complete the standard 30-question interview for {selectedDepartment?.shortName}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-slate-600">
              {Object.values(formData.interviewAnswers).filter(a => a?.trim()).length}/30 questions answered
            </span>
          </div>
        </div>

        {/* AI-Generated Custom Questions */}
        {hasAPIKey && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">AI-Generated Custom Questions</h4>
              </div>
              <button
                type="button"
                onClick={generateCustomQuestions}
                disabled={isGeneratingQuestions}
                className="flex items-center space-x-2 bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingQuestions ? 'Generating...' : 'Generate Questions'}</span>
              </button>
            </div>
            {customQuestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-purple-700 mb-2">Custom questions for {selectedDepartment && departments.find(d => d.id === selectedDepartmentId)?.shortName}:</p>
                {customQuestions.map((question, index) => (
                  <div key={index} className="bg-white rounded p-3 border border-purple-200">
                    <p className="text-sm text-slate-700">{question}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interview Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Interview with [Name] - Licensing & Permitting Process"
                required
              />
            </div>

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
                placeholder="Licensing Manager"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Interview Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="licensing, permits, technology, staffing"
              />
            </div>
          </div>

          {/* Interview Questions by Category */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-slate-800">Standard Interview Questions</h4>
            
            {Object.entries(QUESTION_CATEGORIES).map(([categoryKey, categoryInfo]) => {
              const categoryQuestions = STANDARD_INTERVIEW_QUESTIONS.filter(q => q.category === categoryKey);
              const isExpanded = expandedCategories[categoryKey];
              
              return (
                <div key={categoryKey} className="border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleCategory(categoryKey)}
                    className="w-full px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${categoryInfo.color}`}>
                        {categoryInfo.label}
                      </span>
                      <span className="text-sm text-slate-600">
                        {getAnsweredCount(categoryKey)} answered
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-6 space-y-6 bg-white">
                      {categoryQuestions.map((question, index) => (
                        <div key={question.id}>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            <span className="text-blue-600 font-semibold">Q{question.id.substring(1)}:</span> {question.question}
                          </label>
                          <textarea
                            value={formData.interviewAnswers[question.id] || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                            placeholder="Enter the interviewee's response..."
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <Save className="w-5 h-5" />
              <span>Save Interview</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterviewForm;