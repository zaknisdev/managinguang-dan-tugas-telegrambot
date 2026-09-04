CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_chat_id BIGINT UNIQUE NOT NULL,
  nama TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  judul TEXT NOT NULL,
  deadline TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'done'
  notified_24h BOOLEAN DEFAULT FALSE,
  notified_3h BOOLEAN DEFAULT FALSE,
  notified_1h BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  nominal NUMERIC NOT NULL,
  kategori TEXT,
  deskripsi TEXT,
  sumber TEXT, -- 'manual' | 'struk'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status_deadline ON tasks(status, deadline);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at);
