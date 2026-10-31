import fs from 'fs';
import path from 'path';

describe('Supabase Migrations Verification (Phase 2)', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../supabase/migrations/20261030000000_initial_schema.sql'
  );

  it('migration file exists', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('enforces Row Level Security (RLS) on public.profiles', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Table creation
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.profiles/i);
    expect(sql).toMatch(/REFERENCES auth\.users\(id\) ON DELETE CASCADE/i);

    // RLS activation
    expect(sql).toMatch(/ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY;/i);

    // Strict policies
    expect(sql).toMatch(/CREATE POLICY "Authenticated users can view profiles"/i);
    expect(sql).toMatch(/CREATE POLICY "Users can insert their own profile"/i);
    expect(sql).toMatch(/CREATE POLICY "Users can update their own profile"/i);
    expect(sql).toMatch(/CREATE POLICY "Users can delete their own profile"/i);

    // Verification that write policies verify auth.uid() = id
    expect(sql).toMatch(/WITH CHECK \(auth\.uid\(\) = id\)/i);
  });

  it('defines automatic user profile creation trigger', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.handle_new_user/i);
    expect(sql).toMatch(/TRIGGER on_auth_user_created/i);
    expect(sql).toMatch(/AFTER INSERT ON auth\.users/i);
  });
});
