-- ایجاد extension های لازم
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ایجاد دیتابیس تست
CREATE DATABASE azmoonyar_test;
GRANT ALL PRIVILEGES ON DATABASE azmoonyar_test TO azmoonyar;
