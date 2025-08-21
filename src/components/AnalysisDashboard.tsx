import React, { useState } from 'react';
import { BarChart3, Target, AlertTriangle, Lightbulb, TrendingUp, ChevronRight, Building, FileText, Users, Calendar, Download, Zap, Key } from 'lucide-react';
import { ContentItem, Department, AnalysisResult } from '../types';
import { generateDepartmentAnalysis, checkAPIKey } from '../services/openai';

interface AnalysisDashboardProps {
  contentItems: ContentItem[];
  departments: Department[];
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ contentItems, departments }) => {
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [analysisResults, setAnalysisResults] = useState<{ [key: number]: AnalysisResult }>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);

  const hasAPIKey = checkAPIKey();

  const generateAnalysis = async (departmentId: number) => {
    setIsAnalyzing(true);
    setError(null);
    
    const department = departments.find(d => d.id === departmentId);
    const departmentContent = contentItems.filter(item => item.departmentId === departmentId);
    
    try {
      let analysisResult: AnalysisResult;

      if (useAI && hasAPIKey && departmentContent.length > 0) {
        // Use AI-powered analysis
        const aiResult = await generateDepartmentAnalysis({
          department: department?.name || 'Unknown Department',
          contentItems: departmentContent.map(item => ({
            type: item.type,
            title: item.title,
            content: item.content,
            intervieweeName: item.intervieweeName,
            intervieweeRole: item.intervieweeRole,
            date: item.date
          }))
        });
        analysisResult = aiResult;
      } else {
        // Fallback to mock analysis
        analysisResult = {
          department: department?.name || 'Unknown Department',
          sourceMaterials: departmentContent.map(item => {
            if (item.type === 'interview') {
              return `Interview with ${item.intervieweeName}, ${item.intervieweeRole}`;
            } else if (item.type === 'document') {
              return `Doc: "${item.title}"`;
            } else {
              return `Manual Note: "${item.title}"`;
            }
          }),
          thematicSummary: [
            'Digital transformation and modernization initiatives are central themes',
            'Resource constraints and budget limitations consistently emerge as challenges',
            'Stakeholder engagement and inter-departmental collaboration gaps identified',
            'Technology infrastructure and data management systems need enhancement'
          ],
          keyInsights: [
            'Legacy systems are creating operational inefficiencies',
            'Staff capacity constraints are impacting service delivery',
            'Data collection processes lack standardization',
            'Communication channels require modernization'
          ],
          opportunities: [
            'Implementation of integrated digital platforms',
            'Development of comprehensive staff training programs',
            'Creation of standardized data collection systems'
          ],
          challenges: [
            'Limited budget allocation for technology modernization',
            'Resistance to change among staff members',
            'Complex regulatory requirements'
          ],
          recommendations: [
            'Develop a comprehensive digital transformation roadmap',
            'Establish dedicated change management team',
            'Implement standardized data governance policies'
          ]
        };
      }

      setAnalysisResults(prev => ({
        ...prev,
        [departmentId]: analysisResult
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    }
    
    setIsAnalyzing(false);
  };

  const departmentStats = departments.map(dept => ({
    ...dept,
    contentCount: contentItems.filter(item => item.departmentId === dept.id).length,
    interviewCount: contentItems.filter(item => item.departmentId === dept.id && item.type === 'interview').length,
    documentCount: contentItems.filter(item => item.departmentId === dept.id && item.type === 'document').length,
    noteCount: contentItems.filter(item => item.departmentId === dept.id && item.type === 'note').length
  }));

  const totalContent = contentItems.length;
  const totalInterviews = contentItems.filter(item => item.type === 'interview').length;
  const totalDocuments = contentItems.filter(item => item.type === 'document').length;
  const totalNotes = contentItems.filter(item => item.type === 'note').length;

  const exportAnalysis = () => {
    if (!selectedDepartment || !analysisResults[selectedDepartment]) return;
    
    const analysisResult = analysisResults[selectedDepartment];
    
    const content = `
ALASKA STATE CONSULTING ANALYSIS
================================

Division: ${analysisResult.department}

📘 Source Materials Analyzed:
${analysisResult.sourceMaterials.map(source => `- ${source}`).join('\n')}

🧵 Thematic Summary:
${analysisResult.thematicSummary.map(theme => `- ${theme}`).join('\n')}

💡 Key Insights:
${analysisResult.keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

🚀 Opportunities Identified:
${analysisResult.opportunities.map(opp => `- ${opp}`).join('\n')}

⚠️ Challenges / Risks Noted:
${analysisResult.challenges.map(challenge => `- ${challenge}`).join('\n')}

🧭 Strategic Recommendations:
${analysisResult.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

---
Generated on: ${new Date().toLocaleDateString()}
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alaska-consulting-analysis-${selectedDepartment}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentAnalysis = selectedDepartment ? analysisResults[selectedDepartment] : null;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Analysis Dashboard</h2>
        <p className="text-slate-600">Generate comprehensive consulting summaries for individual departments.</p>
      </div>

      {/* AI Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-slate-800">AI-Powered Analysis</h3>
              <p className="text-sm text-slate-600">
                {hasAPIKey ? 'OpenAI integration active' : 'OpenAI API key required for AI analysis'}
              </p>
            </div>
          </div>
          {!hasAPIKey && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              <Key className="w-4 h-4" />
              <span className="text-sm">Configure API key in .env file</span>
            </div>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Content</p>
              <p className="text-2xl font-bold text-slate-900">{totalContent}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Interviews</p>
              <p className="text-2xl font-bold text-slate-900">{totalInterviews}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Documents</p>
              <p className="text-2xl font-bold text-slate-900">{totalDocuments}</p>
            </div>
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Notes</p>
              <p className="text-2xl font-bold text-slate-900">{totalNotes}</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Department Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Select Department for Analysis</h3>
        <div className="grid grid-cols-1 gap-4">
          {departmentStats.map(dept => (
            <div
              key={dept.id}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedDepartment === dept.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
              onClick={() => setSelectedDepartment(dept.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800">{dept.name}</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    {dept.contentCount} items total ({dept.interviewCount} interviews, {dept.documentCount} documents, {dept.noteCount} notes)
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {dept.contentCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDepartment(dept.id);
                        generateAnalysis(dept.id);
                      }}
                      disabled={isAnalyzing}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAnalyzing && selectedDepartment === dept.id ? 'Analyzing...' : 'Generate Analysis'}
                    </button>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Analysis Error</h3>
              <p className="text-red-700">{error}</p>
              {!hasAPIKey && (
                <p className="text-sm text-red-600 mt-2">
                  Please add your OpenAI API key to the .env file to enable AI analysis.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {currentAnalysis && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Consulting Analysis Results</h3>
            <button
              onClick={exportAnalysis}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Analysis</span>
            </button>
          </div>

          <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
              <h4 className="text-xl font-bold text-slate-800 mb-2">Division: {currentAnalysis.department}</h4>
            </div>

            {/* Source Materials */}
            <div>
              <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                📘 Source Materials Analyzed:
              </h5>
              <ul className="space-y-1 text-slate-700">
                {currentAnalysis.sourceMaterials.map((source, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-slate-400 mr-2">-</span>
                    <span>{source}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Thematic Summary */}
            <div>
              <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                🧵 Thematic Summary:
              </h5>
              <ul className="space-y-2 text-slate-700">
                {currentAnalysis.thematicSummary.map((theme, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-slate-400 mr-2">-</span>
                    <span>{theme}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Insights */}
            <div>
              <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2" />
                💡 Key Insights:
              </h5>
              <ol className="space-y-2 text-slate-700">
                {currentAnalysis.keyInsights.map((insight, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-slate-400 mr-2 font-medium">{index + 1}.</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Opportunities */}
            <div>
              <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                🚀 Opportunities Identified:
              </h5>
              <ul className="space-y-2 text-slate-700">
                {currentAnalysis.opportunities.map((opportunity, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-slate-400 mr-2">-</span>
                    <span>{opportunity}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Challenges */}
            <div>
              <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                ⚠️ Challenges / Risks Noted:
              </h5>
              <ul className="space-y-2 text-slate-700">
                {currentAnalysis.challenges.map((challenge, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-slate-400 mr-2">-</span>
                    <span>{challenge}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div>
              <h5 className="font-semibold text-slate-800 mb-3 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                🧭 Strategic Recommendations:
              </h5>
              <ol className="space-y-2 text-slate-700">
                {currentAnalysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-slate-400 mr-2 font-medium">{index + 1}.</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {selectedDepartment && !currentAnalysis && !isAnalyzing && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 text-center">
          <BarChart3 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">Ready to Generate Analysis</h3>
          <p className="text-blue-700 mb-4">
            Click "Generate Analysis" for {departments.find(d => d.id === selectedDepartment)?.name} to create a comprehensive consulting summary.
          </p>
        </div>
      )}

      {isAnalyzing && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-yellow-200 border-t-yellow-600 rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-yellow-900 mb-2">Analyzing Content</h3>
          <p className="text-yellow-700">
            Processing {contentItems.filter(item => item.departmentId === selectedDepartment).length} content items for {departments.find(d => d.id === selectedDepartment)?.name}...
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalysisDashboard;