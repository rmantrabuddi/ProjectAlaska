# Alaska State Consulting Platform

A comprehensive consulting analysis platform for Alaska state departments with AI-powered insights.

## Features

- **Department Overview**: Track content and analysis across 5 key Alaska state departments
- **Content Management**: Organize interviews, documents, and notes
- **Structured Interviews**: 30-question standardized interview format
- **AI-Powered Analysis**: Generate comprehensive consulting reports using OpenAI
- **Content Enhancement**: AI-assisted content structuring and insights
- **Custom Question Generation**: AI-generated department-specific interview questions

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure OpenAI API key:
Create a `.env` file in the root directory and add:
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

3. Start the development server:
```bash
npm run dev
```

## AI Features

### Analysis Dashboard
- Generate comprehensive consulting reports using GPT-4
- Analyze interviews, documents, and notes
- Extract key insights, opportunities, and recommendations
- Export detailed analysis reports

### Content Enhancement
- AI-powered content structuring and organization
- Extract key themes and actionable insights
- Improve content quality for better analysis

### Custom Interview Questions
- Generate department-specific interview questions
- Tailored to each department's focus areas
- Complement the standard 30-question framework

## Departments Covered

1. **Department of Fish and Game** - Wildlife and fisheries management
2. **Department of Natural Resources** - Resource development and environmental protection
3. **Department of Environmental Conservation** - Environmental protection and public health
4. **Department of Commerce, Community, and Economic Development** - Economic development and community support
5. **Department of Administration – Division of Motor Vehicles** - Motor vehicle services and licensing

## Usage

1. **State Overview**: View all departments and their current content status
2. **Content Input**: Add interviews, documents, or notes for specific departments
3. **Content Management**: Review and organize all submitted content
4. **Analysis Dashboard**: Generate AI-powered consulting reports

## Technology Stack

- React + TypeScript
- Tailwind CSS
- OpenAI API (GPT-4 for analysis, GPT-3.5-turbo for content enhancement)
- Vite for development and building

## Environment Variables

- `VITE_OPENAI_API_KEY`: Your OpenAI API key for AI-powered features