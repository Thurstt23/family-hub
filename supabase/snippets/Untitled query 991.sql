SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'Public'
ORDER BY tablename;