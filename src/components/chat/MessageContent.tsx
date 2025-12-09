import { extractCodeBlocks } from '@/lib/codeDetection';
import { CodeBlock } from './CodeBlock';

interface MessageContentProps {
  content: string;
}

export function MessageContent({ content }: MessageContentProps) {
  const blocks = extractCodeBlocks(content);
  
  // Simple text message
  if (blocks.length === 1 && !blocks[0].isBlock) {
    return <span>{content}</span>;
  }

  return (
    <div className="space-y-1">
      {blocks.map((block, index) => (
        block.isBlock ? (
          <CodeBlock
            key={index}
            code={block.code}
            language={block.language || 'text'}
            isCollapsible={block.code.split('\n').length > 10}
            defaultCollapsed={block.code.split('\n').length > 20}
          />
        ) : (
          <span key={index}>{block.code}</span>
        )
      ))}
    </div>
  );
}
