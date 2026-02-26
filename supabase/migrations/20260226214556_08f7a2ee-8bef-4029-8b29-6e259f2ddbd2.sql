
-- Pool chat messages table
CREATE TABLE public.pool_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  reply_to_id uuid REFERENCES public.pool_messages(id) ON DELETE SET NULL,
  reactions_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pool_messages_pool_created ON public.pool_messages(pool_id, created_at DESC);

ALTER TABLE public.pool_messages ENABLE ROW LEVEL SECURITY;

-- Only pool members can view messages
CREATE POLICY "View messages in own pools" ON public.pool_messages
  FOR SELECT TO authenticated USING (public.is_pool_member(auth.uid(), pool_id));

-- Only pool members can send messages
CREATE POLICY "Send messages in own pools" ON public.pool_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_pool_member(auth.uid(), pool_id));

-- Users can update own messages (for reactions by others, use RPC)
CREATE POLICY "Update own messages" ON public.pool_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can delete own messages
CREATE POLICY "Delete own messages" ON public.pool_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable Realtime for pool_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_messages;

-- Function to add reaction to a message (any pool member)
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(_message_id uuid, _emoji text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  msg_pool_id uuid;
  current_reactions jsonb;
  user_list jsonb;
  uid text;
BEGIN
  uid := auth.uid()::text;

  SELECT pool_id, reactions_json INTO msg_pool_id, current_reactions
  FROM public.pool_messages WHERE id = _message_id;

  IF msg_pool_id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF NOT public.is_pool_member(auth.uid(), msg_pool_id) THEN
    RAISE EXCEPTION 'Not a pool member';
  END IF;

  IF current_reactions IS NULL THEN
    current_reactions := '{}'::jsonb;
  END IF;

  user_list := COALESCE(current_reactions->_emoji, '[]'::jsonb);

  IF user_list ? uid THEN
    -- Remove reaction
    user_list := (SELECT jsonb_agg(v) FROM jsonb_array_elements(user_list) v WHERE v #>> '{}' <> uid);
    IF user_list IS NULL THEN
      current_reactions := current_reactions - _emoji;
    ELSE
      current_reactions := jsonb_set(current_reactions, ARRAY[_emoji], user_list);
    END IF;
  ELSE
    -- Add reaction
    user_list := user_list || to_jsonb(uid);
    current_reactions := jsonb_set(current_reactions, ARRAY[_emoji], user_list);
  END IF;

  UPDATE public.pool_messages SET reactions_json = current_reactions WHERE id = _message_id;
END;
$function$;
