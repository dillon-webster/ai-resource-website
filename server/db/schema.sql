CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  category text,
  tags text[],
  submitter_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  stars integer,
  github_repo text,
  votes integer NOT NULL DEFAULT 0
);
