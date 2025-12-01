import { useState, KeyboardEvent } from 'react';
import { Send, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface MessageInputProps {
  onSend: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({ onSend, placeholder, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border">
      <div className="flex items-end gap-2 bg-secondary rounded-lg p-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Type a message...'}
          disabled={disabled}
          className="min-h-[40px] max-h-[120px] bg-transparent border-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={1}
        />
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button 
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            size="icon"
            className="h-8 w-8"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 px-2">
        Press Enter to send, Shift + Enter for new line
      </p>
    </div>
  );
}