-- Create user_preferences table
create table if not exists user_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  max_related_ideas integer default 8,
  accent_color text default '#155DFC',
  display_name text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Ensure one preferences record per user
  unique(user_id)
);

-- Enable RLS
alter table user_preferences enable row level security;

-- RLS policies - users can only access their own preferences
create policy "Users can view their own preferences" on user_preferences
  for select using (auth.uid() = user_id);

create policy "Users can insert their own preferences" on user_preferences
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own preferences" on user_preferences
  for update using (auth.uid() = user_id);

create policy "Users can delete their own preferences" on user_preferences
  for delete using (auth.uid() = user_id);

-- Create index for faster queries
create index user_preferences_user_id_idx on user_preferences(user_id);

-- Update updated_at column automatically
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_preferences_updated_at
  before update on user_preferences
  for each row
  execute function update_updated_at_column();
