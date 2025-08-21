import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface AnalysisPrompt {
  department: string;
  contentItems: Array<{
    type: string;
    title: string;
    content: string;
    intervieweeName?: string;
    intervieweeRole?: string;
    date: string;
  }>;
}

export interface AIAnalysisResult {
  department: string;
  sourceMaterials: string[];
  thematicSummary: string[];
  keyInsights: string[];
  opportunities: string[];
  challenges: string[];
  recommendations: string[];
}

export const generateDepartmentAnalysis = async (prompt: AnalysisPrompt): Promise<AIAnalysisResult> => {
  const systemPrompt = `You are an expert government consulting analyst specializing in Alaska state government operations. 
  
  Your task is to analyze content from interviews, documents, and notes to provide comprehensive consulting insights for Alaska state departments.
  
  Focus on:
  - Licensing and permitting processes
  - Technology systems and modernization
  - Staffing and organizational challenges
  - Cross-departmental coordination
  - Operational efficiency improvements
  - Budget and resource optimization
  - Regulatory compliance
  - Public service delivery
  
  Provide actionable, specific recommendations based on the evidence in the content.`;

  const userPrompt = `Analyze the following content for ${prompt.department}:

${prompt.contentItems.map((item, index) => `
--- Content Item ${index + 1} ---
Type: ${item.type}
Title: ${item.title}
${item.intervieweeName ? `Interviewee: ${item.intervieweeName} (${item.intervieweeRole})` : ''}
Date: ${item.date}

Content:
${item.content}
`).join('\n')}

Please provide a comprehensive analysis in the following JSON format:
{
  "department": "${prompt.department}",
  "sourceMaterials": ["List of source materials analyzed"],
  "thematicSummary": ["5-7 key themes identified across all content"],
  "keyInsights": ["10-15 specific insights with evidence from the content"],
  "opportunities": ["6-8 specific opportunities for improvement"],
  "challenges": ["6-8 key challenges and risks identified"],
  "recommendations": ["8-12 actionable strategic recommendations"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const analysisResult = JSON.parse(response);
    return analysisResult;
  } catch (error) {
    console.error('OpenAI Analysis Error:', error);
    throw new Error('Failed to generate AI analysis. Please check your API key and try again.');
  }
};

export const generateInterviewQuestions = async (departmentName: string, departmentDescription: string): Promise<string[]> => {
  const systemPrompt = `You are an expert government consultant who creates targeted interview questions for Alaska state departments.
  
  Generate 5-7 specific, actionable interview questions that would help understand:
  - Current operational challenges
  - Technology and system needs
  - Process inefficiencies
  - Staffing and resource gaps
  - Opportunities for improvement
  
  Questions should be open-ended and designed to elicit detailed, useful responses from department staff.`;

  const userPrompt = `Generate targeted interview questions for: ${departmentName}
  
  Department Description: ${departmentDescription}
  
  Return only a JSON array of question strings, no other text:
  ["question 1", "question 2", ...]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(response);
  } catch (error) {
    console.error('OpenAI Question Generation Error:', error);
    throw new Error('Failed to generate interview questions');
  }
};

export const enhanceContentWithAI = async (content: string, contentType: string): Promise<string> => {
  const systemPrompt = `You are an expert content analyst for government consulting. 
  
  Your task is to enhance and structure content to make it more useful for analysis.
  
  For interviews: Extract key quotes, identify themes, and highlight actionable insights.
  For documents: Summarize key points, identify policy implications, and extract relevant data.
  For notes: Organize information, identify patterns, and suggest follow-up questions.`;

  const userPrompt = `Enhance this ${contentType} content for better analysis:

${content}

Please:
1. Maintain all original information
2. Add structure and organization
3. Highlight key insights and themes
4. Identify actionable items
5. Suggest areas for follow-up

Return the enhanced content in a clear, well-organized format.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content;
    return response || content;
  } catch (error) {
    console.error('Content Enhancement Error:', error);
    return content; // Return original content if enhancement fails
  }
};

export const checkAPIKey = (): boolean => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  return !!(apiKey && apiKey !== 'your_openai_api_key_here');
};