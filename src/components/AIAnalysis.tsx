import React, { useState } from 'react';
import { Brain, TrendingUp, AlertTriangle, Target, Lightbulb, Loader2 } from 'lucide-react';
import { openAIService, AIAnalysisResult } from '../services/openai';

interface AIAnalysisProps {
  data: {
    interviews: any[];
    documents: any[];
    inventory: any[];
  };
  selectedDepartment?: string;
}

const AIAnalysis: React.FC<AIAnalysisProps> = ({ data, selectedDepartment }) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        // Department-specific analysis
        const departmentInterviews = data.interviews.filter(
          interview => interview.department === selectedDepartment
        );
        const interviewTexts = departmentInterviews.map(interview => interview.notes);
        
        result = await openAIService.analyzeInterviewNotes(interviewTexts, selectedDepartment);
      } else {
        // Cross-departmental analysis
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
      const result = await openAIService.generateDataInsights(data.inventory);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during data analysis');
    } finally {
      setLoading(false);
    }
  };

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
      {/* Analysis Controls */}
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
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Brain className="w-5 h-5 mr-2" />
            )}
            {selectedDepartment ? `Analyze ${selectedDepartment}` : 'Cross-Department Analysis'}
          </button>
          
          <button
            onClick={generateDataInsights}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="w-5 h-5 mr-2" />
            )}
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
          {/* Executive Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
            <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Key Insights */}
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Lightbulb className="w-6 h-6 text-blue-600 mr-2" />
                <h4 className="text-lg font-semibold text-blue-900">Key Insights</h4>
              </div>
              <ul className="space-y-2">
                {analysis.keyInsights.map((insight, index) => (
                  <li key={index} className="text-blue-800 text-sm">
                    • {insight}
                  </li>
                ))}
              </ul>
            </div>

            {/* Challenges */}
            <div className="bg-red-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-2" />
                <h4 className="text-lg font-semibold text-red-900">Challenges</h4>
              </div>
              <ul className="space-y-2">
                {analysis.challenges.map((challenge, index) => (
                  <li key={index} className="text-red-800 text-sm">
                    • {challenge}
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Target className="w-6 h-6 text-green-600 mr-2" />
                <h4 className="text-lg font-semibold text-green-900">Opportunities</h4>
              </div>
              <ul className="space-y-2">
                {analysis.opportunities.map((opportunity, index) => (
                  <li key={index} className="text-green-800 text-sm">
                    • {opportunity}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="bg-purple-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-600 mr-2" />
                <h4 className="text-lg font-semibold text-purple-900">Recommendations</h4>
              </div>
              <ul className="space-y-2">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-purple-800 text-sm">
                    • {recommendation}
                  </li>
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
          <p className="text-gray-500">
            AI is processing your data to generate insights and recommendations.
          </p>
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