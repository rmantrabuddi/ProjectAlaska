const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export interface AIAnalysisResult {
  summary: string;
  keyInsights: string[];
  challenges: string[];
  opportunities: string[];
  recommendations: string[];
}

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  relevantDepartments: string[];
  actionItems: string[];
}

class OpenAIService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. AI features will be disabled.');
    }
  }

  private async makeRequest(endpoint: string, data: any) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    return response.json();
  }

  async analyzeInterviewNotes(notes: string[], department?: string): Promise<AIAnalysisResult> {
    const prompt = `
    Analyze the following interview notes from Alaska State Department${department ? ` of ${department}` : 's'}. 
    Provide a comprehensive analysis focusing on:
    1. Overall summary of findings
    2. Key insights discovered
    3. Challenges identified
    4. Opportunities for improvement
    5. Actionable recommendations

    Interview Notes:
    ${notes.join('\n\n---\n\n')}

    Please provide a structured analysis in JSON format with the following structure:
    {
      "summary": "Overall summary of the interviews",
      "keyInsights": ["insight 1", "insight 2", ...],
      "challenges": ["challenge 1", "challenge 2", ...],
      "opportunities": ["opportunity 1", "opportunity 2", ...],
      "recommendations": ["recommendation 1", "recommendation 2", ...]
    }
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert government analyst specializing in Alaska state department operations, licensing, and permit processes. Provide detailed, actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Error analyzing interview notes:', error);
      throw error;
    }
  }

  async analyzeDocument(documentText: string, documentName: string): Promise<DocumentAnalysis> {
    const prompt = `
    Analyze the following document from Alaska State Departments: "${documentName}"
    
    Document Content:
    ${documentText}

    Please provide analysis in JSON format:
    {
      "summary": "Brief summary of the document",
      "keyPoints": ["key point 1", "key point 2", ...],
      "relevantDepartments": ["department names that this document relates to"],
      "actionItems": ["actionable item 1", "actionable item 2", ...]
    }
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert document analyst for Alaska state government operations. Focus on licensing, permits, regulations, and operational efficiency.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    }
  }

  async generateDataInsights(inventoryData: any[]): Promise<AIAnalysisResult> {
    const dataString = JSON.stringify(inventoryData, null, 2);
    
    const prompt = `
    Analyze the following Alaska State Department inventory data for licenses and permits.
    Focus on trends, efficiency opportunities, and revenue optimization.

    Data:
    ${dataString}

    Provide analysis in JSON format:
    {
      "summary": "Overall analysis of the data trends",
      "keyInsights": ["insight about trends, patterns, etc."],
      "challenges": ["operational challenges identified"],
      "opportunities": ["opportunities for improvement"],
      "recommendations": ["specific actionable recommendations"]
    }
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a data analyst specializing in government operations, licensing efficiency, and revenue optimization for Alaska state departments.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating data insights:', error);
      throw error;
    }
  }

  async summarizeAcrossDepartments(allData: {
    interviews: any[];
    documents: any[];
    inventory: any[];
  }): Promise<AIAnalysisResult> {
    const prompt = `
    Provide a comprehensive cross-departmental analysis for Alaska State Departments based on:
    
    Interview Data: ${JSON.stringify(allData.interviews)}
    Document Data: ${JSON.stringify(allData.documents)}
    Inventory Data: ${JSON.stringify(allData.inventory)}

    Focus on:
    1. Cross-departmental patterns and trends
    2. Shared challenges and opportunities
    3. Potential for collaboration and standardization
    4. Strategic recommendations for the state

    Provide analysis in JSON format:
    {
      "summary": "Cross-departmental executive summary",
      "keyInsights": ["cross-cutting insights"],
      "challenges": ["systemic challenges"],
      "opportunities": ["strategic opportunities"],
      "recommendations": ["high-level strategic recommendations"]
    }
    `;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a senior government consultant specializing in Alaska state operations, cross-departmental efficiency, and strategic planning.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2500,
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating cross-departmental analysis:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const openAIService = new OpenAIService();