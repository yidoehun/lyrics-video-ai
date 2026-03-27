create table projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  artist text,
  lyrics_data jsonb,
  style_data jsonb,
  created_at timestamp with time zone default now()
);

alter table projects enable row level security;

create policy "Users can manage own projects"
  on projects
  for all
  using (auth.uid() = user_id);
