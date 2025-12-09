// Detect if content contains code, error logs, or stack traces
export interface ContentAnalysis {
  hasCode: boolean;
  language: string | null;
  isError: boolean;
  isLongContent: boolean;
  shouldThread: boolean;
}

const CODE_PATTERNS = [
  /```[\s\S]*```/,                    // Markdown code blocks
  /^(import|export|const|let|var|function|class|interface|type)\s/m,
  /^\s*(def|class|import|from|if|else|elif|for|while|try|except)\s/m,
  /^\s*(<\?php|namespace|use\s+[\w\\]+;)/m,
  /^\s*(package|import\s+java|public\s+class)/m,
  /^\s*#include\s*[<"]/m,
  /^\s*@(Component|Injectable|Entity|Controller)/m,
  /\{[\s\S]*:\s*[\s\S]*\}/,           // JSON-like objects
  /\[\s*\{[\s\S]*\}\s*\]/,            // JSON arrays
  /^\s*SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER/im,
  /=>/,                                // Arrow functions
  /\(\)\s*{/,                          // Function declarations
  /^\s*\/\/.*/m,                       // JS comments
  /^\s*#.*/m,                          // Python/Shell comments
];

const ERROR_PATTERNS = [
  /Error:|Exception:|Traceback|FATAL|WARN|ERROR/i,
  /at\s+[\w.$]+\s*\(.*:\d+:\d+\)/,    // Stack trace lines
  /^\s+at\s+/m,                        // Indented "at" lines
  /\[error\]|\[warn\]|\[fatal\]/i,
  /npm\s+ERR!|yarn\s+error/i,
  /TypeError|ReferenceError|SyntaxError|RangeError/,
  /failed|failure|crashed/i,
];

const LANGUAGE_PATTERNS: [RegExp, string][] = [
  [/```(\w+)/, '$1'],                  // Markdown code block language
  [/^\s*import\s+.*\s+from\s+['"]/, 'typescript'],
  [/^\s*import\s+React/, 'tsx'],
  [/^\s*(const|let|var)\s+\w+\s*=/, 'javascript'],
  [/^\s*function\s+\w+\s*\(/, 'javascript'],
  [/^\s*def\s+\w+\s*\(/, 'python'],
  [/^\s*class\s+\w+\s*(\(|:)/, 'python'],
  [/^\s*<\?php/, 'php'],
  [/^\s*package\s+\w+;/, 'java'],
  [/^\s*#include\s*[<"]/, 'cpp'],
  [/^\s*CREATE\s+TABLE|SELECT\s+/i, 'sql'],
  [/^\s*\{[\s\S]*"[\w]+"\s*:/, 'json'],
  [/^\s*<\w+[^>]*>/, 'html'],
  [/^\s*\.\w+\s*\{/, 'css'],
  [/^\s*@\w+\s*\{/, 'css'],
  [/^\s*\$\s+|^\s*#.*bash/i, 'bash'],
];

export function analyzeContent(content: string): ContentAnalysis {
  const lineCount = content.split('\n').length;
  const isLongContent = lineCount > 5 || content.length > 500;
  
  const hasCode = CODE_PATTERNS.some(pattern => pattern.test(content));
  const isError = ERROR_PATTERNS.some(pattern => pattern.test(content));
  
  let language: string | null = null;
  
  // Extract language from markdown code block first
  const mdMatch = content.match(/```(\w+)/);
  if (mdMatch) {
    language = mdMatch[1];
  } else {
    // Try to detect language from patterns
    for (const [pattern, lang] of LANGUAGE_PATTERNS) {
      if (pattern.test(content)) {
        language = lang;
        break;
      }
    }
  }
  
  // Default to 'text' for errors without detected language
  if (isError && !language) {
    language = 'text';
  }
  
  const shouldThread = (hasCode && isLongContent) || isError || lineCount > 10;
  
  return {
    hasCode,
    language,
    isError,
    isLongContent,
    shouldThread,
  };
}

// Extract code blocks from content
export function extractCodeBlocks(content: string): { code: string; language: string | null; isBlock: boolean }[] {
  const blocks: { code: string; language: string | null; isBlock: boolean }[] = [];
  
  // Match markdown code blocks
  const mdBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  
  while ((match = mdBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        blocks.push({ code: text, language: null, isBlock: false });
      }
    }
    
    // Add code block
    blocks.push({
      code: match[2].trim(),
      language: match[1] || 'text',
      isBlock: true,
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      const analysis = analyzeContent(remaining);
      blocks.push({
        code: remaining,
        language: analysis.hasCode ? analysis.language : null,
        isBlock: analysis.hasCode,
      });
    }
  }
  
  // If no blocks found, analyze whole content
  if (blocks.length === 0) {
    const analysis = analyzeContent(content);
    blocks.push({
      code: content,
      language: analysis.hasCode || analysis.isError ? analysis.language : null,
      isBlock: analysis.hasCode || analysis.isError,
    });
  }
  
  return blocks;
}
