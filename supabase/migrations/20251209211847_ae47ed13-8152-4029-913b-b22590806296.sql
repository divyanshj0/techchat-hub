-- Add parent_id for thread support
ALTER TABLE public.messages 
ADD COLUMN parent_id UUID REFERENCES public.messages(id) ON DELETE CASCADE;

-- Add is_thread_parent to track messages that have threads
ALTER TABLE public.messages 
ADD COLUMN reply_count INTEGER DEFAULT 0;

-- Create index for faster thread queries
CREATE INDEX idx_messages_parent_id ON public.messages(parent_id);

-- Function to update reply count
CREATE OR REPLACE FUNCTION public.update_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_id IS NOT NULL THEN
    UPDATE public.messages 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.parent_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_id IS NOT NULL THEN
    UPDATE public.messages 
    SET reply_count = reply_count - 1 
    WHERE id = OLD.parent_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for reply count
CREATE TRIGGER trigger_update_reply_count
AFTER INSERT OR DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_reply_count();