import React, { useState } from 'react';
import { Search, Filter, Trash2, FileText, MessageSquare, StickyNote, Calendar, User, Building, Tag, ChevronDown } from 'lucide-react';
import { ContentItem, Department } from '../types';

interface ContentManagementProps {
  contentItems: ContentItem[];
  departments: Department[];
  onRemoveContent: (id: string) => void;
}

const ContentManagement: React.FC<ContentManagementProps> = ({ 
  contentItems, 
  departments, 
  onRemoveContent 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filteredItems = contentItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.intervieweeName && item.intervieweeName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDepartment = !selectedDepartment || item.departmentId === selectedDepartment;
    const matchesType = !selectedType || item.type === selectedType;

    return matchesSearch && matchesDepartment && matchesType;
  });

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'interview': return MessageSquare;
      case 'document': return FileText;
      case 'note': return StickyNote;
      default: return FileText;
    }
  };

  const getContentColor = (type: string) => {
    switch (type) {
      case 'interview': return 'bg-blue-100 text-blue-700';
      case 'document': return 'bg-green-100 text-green-700';
      case 'note': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getDepartmentName = (id: number) => {
    return departments.find(d => d.id === id)?.shortName || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Content Management</h2>
        <p className="text-slate-600">Review, organize, and manage all submitted content across departments.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search content..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartment || ''}
            onChange={(e) => setSelectedDepartment(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.shortName}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType || ''}
            onChange={(e) => setSelectedType(e.target.value || null)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">All Types</option>
            <option value="interview">Interviews</option>
            <option value="document">Documents</option>
            <option value="note">Notes</option>
          </select>

          {/* Stats */}
          <div className="text-sm text-slate-600 flex items-center justify-end">
            <span className="bg-slate-100 px-3 py-2 rounded-lg">
              {filteredItems.length} of {contentItems.length} items
            </span>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No content found</h3>
            <p className="text-slate-600">
              {contentItems.length === 0 
                ? "Start by adding some content using the Content Input tab."
                : "Try adjusting your search filters to find the content you're looking for."
              }
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const Icon = getContentIcon(item.type);
            const isExpanded = expandedItem === item.id;
            
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg ${getContentColor(item.type)} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-slate-800 mb-1">{item.title}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center space-x-1">
                            <Building className="w-4 h-4" />
                            <span>{getDepartmentName(item.departmentId)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(item.date).toLocaleDateString()}</span>
                          </div>
                          {item.intervieweeName && (
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{item.intervieweeName} - {item.intervieweeRole}</span>
                            </div>
                          )}
                        </div>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.tags.map((tag, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <ChevronDown className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      <button
                        onClick={() => onRemoveContent(item.id)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Content Preview */}
                  {!isExpanded && (
                    <p className="text-slate-600 text-sm line-clamp-2">
                      {item.content.substring(0, 200)}...
                    </p>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-6 bg-slate-50">
                    <h4 className="font-medium text-slate-800 mb-3">Full Content</h4>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                        {item.content}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ContentManagement;