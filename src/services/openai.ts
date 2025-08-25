const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
import { z } from 'zod';

export type ExtractInterviewIn = {
  text: string;
  meta?: {
    department?: string;
    division?: string;
    interview_date?: string;
    duration_minutes?: number;
    filename?: string;
  };
};

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
// call the server (NOT OpenAI directly from the browser)
export async function extractInterviewFields(input: ExtractInterviewIn) {
  const res = await fetch('/api/ai/extract-interview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    // surface the real error body
    const bodyText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${bodyText}`);
  }

  const data = await res.json();
  return data; // your zod parse can happen here or on the server
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

// Zod schema for AI analysis result validation
const AIAnalysisSchema = z.object({
  analysis_type: z.literal('interview_analysis'),
  schema_version: z.string(),
  department_name: z.string(),
  division: z.string().nullable(),
  interview_date: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  summary: z.string(),
  key_insights: z.array(z.string()),
  challenges: z.array(z.string()),
  opportunities: z.array(z.string()),
  recommendations: z.array(z.string()),
  evidence: z.array(z.object({
    quote: z.string(),
    why_it_matters: z.string(),
    tags: z.array(z.enum(['insight', 'challenge', 'opportunity', 'recommendation']))
  })),
  risk_flags: z.array(z.object({
    label: z.string(),
    description: z.string()
  })),
  confidence_score: z.number().min(0).max(1),
  source_data_hash: z.string()
});

export type AIAnalysisResultLike = z.infer<typeof AIAnalysisSchema>;

// Add to OpenAIService class
export class OpenAIServiceExtended extends OpenAIService {
  async analyzeInterviewNotesToJson(
    rawText: string,
    meta: {
      department_name: string;
      division: string;
      interview_date: string;
      duration_minutes: number;
      interviewee_name?: string;
      interviewer_name?: string;
      document_name: string;
      source_data_hash: string;
    }
  ): Promise<AIAnalysisResultLike> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const userPrompt = `Analyze this interview and return JSON exactly matching the schema.

=== METADATA ===
department_name: ${meta.department_name}
division: ${meta.division}
interview_date: ${meta.interview_date}
duration_minutes: ${meta.duration_minutes}
interviewee_name: ${meta.interviewee_name || 'N/A'}
interviewer_name: ${meta.interviewer_name || 'N/A'}
document_name: ${meta.document_name}
source_data_hash: ${meta.source_data_hash}

=== RAW_NOTES ===
${rawText}

=== OUTPUT SCHEMA ===
{
  "analysis_type": "interview_analysis",
  "schema_version": "1.0",
  "department_name": "string",
  "division": "string | null",
  "interview_date": "string | null",
  "duration_minutes": "number | null",
  "summary": "string (<=150 words)",
  "key_insights": ["string", "..."],        // 3–7 items
  "challenges": ["string", "..."],          // 3–7 items
  "opportunities": ["string", "..."],       // 3–7 items
  "recommendations": ["string", "..."],     // 3–7 items, actionable
  "evidence": [
    {
      "quote": "string (<=30 words)",
      "why_it_matters": "string (1–2 sentences)",
      "tags": ["insight"|"challenge"|"opportunity"|"recommendation"]
    }
  ],
  "risk_flags": [
    { "label": "string", "description": "string (<=24 words)" }
  ],
  "confidence_score": 0.0,                   // 0–1
  "source_data_hash": "string"
}`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a neutral public-sector process analyst. Given raw interview notes, produce a concise, decision-ready analysis. Never invent facts. Use only the notes. Output JSON only matching the provided schema; no extra keys or commentary.'
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000,
      });

      const content = response.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        return AIAnalysisSchema.parse(parsed);
      } catch (parseError) {
        // Attempt JSON repair by cleaning common issues
        const cleaned = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/^\s*```\s*/, '')
          .replace(/\s*```\s*$/, '')
          .trim();
        
        try {
          const parsed = JSON.parse(cleaned);
          return AIAnalysisSchema.parse(parsed);
        } catch (repairError) {
          throw new Error(`Failed to parse AI response as valid JSON: ${parseError}`);
        }
      }
    } catch (error) {
      console.error('Error in analyzeInterviewNotesToJson:', error);
      throw error;
    }
  }
}

// Export extended service
export const openAIServiceExtended = new OpenAIServiceExtended();