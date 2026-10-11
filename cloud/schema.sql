CREATE TABLE IF NOT EXISTS states (
  owner TEXT PRIMARY KEY,
  revision INTEGER NOT NULL,
  mutation TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS backups (
  owner TEXT NOT NULL,
  revision INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (owner, revision)
);
CREATE TABLE IF NOT EXISTS subscriptions (
  owner TEXT NOT NULL,
  id TEXT NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (owner, id)
);
CREATE TABLE IF NOT EXISTS deliveries (
  owner TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  day TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (owner, subscription_id, day)
);
