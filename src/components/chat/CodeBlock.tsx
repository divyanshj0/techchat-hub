import { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CodeBlockProps {
  code: string;
  language?: string;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  typescript: 'tsx',
  javascript: 'jsx',
  js: 'jsx',
  ts: 'tsx',
  python: 'python',
  py: 'python',
  bash: 'bash',
  shell: 'bash',
  sh: 'bash',
  json: 'json',
  html: 'markup',
  xml: 'markup',
  css: 'css',
  scss: 'css',
  sql: 'sql',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  text: 'bash',
};

export function CodeBlock({ 
  code, 
  language = 'text', 
  isCollapsible = false,
  defaultCollapsed = false,
  className 
}: CodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied] = useState(false);
  
  const lineCount = code.split('\n').length;
  const mappedLanguage = LANGUAGE_MAP[language.toLowerCase()] || 'bash';
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const showCollapse = isCollapsible && lineCount > 5;

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden my-2 bg-[#1e1e2e] border border-border/30",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-border/30">
        <div className="flex items-center gap-2">
          {showCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {language.toLowerCase()}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {lineCount} line{lineCount !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code */}
      {!isCollapsed && (
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Highlight
            theme={themes.nightOwl}
            code={code}
            language={mappedLanguage as any}
          >
            {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
              <pre 
                className={cn(hlClassName, "p-3 text-sm leading-relaxed m-0")}
                style={{ ...style, background: 'transparent' }}
              >
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })} className="table-row">
                    <span className="table-cell pr-4 text-right text-muted-foreground/40 select-none text-xs">
                      {i + 1}
                    </span>
                    <span className="table-cell">
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>
      )}

      {isCollapsed && (
        <div 
          className="px-3 py-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted/10"
          onClick={() => setIsCollapsed(false)}
        >
          Click to expand {lineCount} lines...
        </div>
      )}
    </div>
  );
}
