-- Cria o banco de testes ao lado do dev (usado por TEST_DATABASE_URL).
SELECT 'CREATE DATABASE casai_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'casai_test')\gexec
