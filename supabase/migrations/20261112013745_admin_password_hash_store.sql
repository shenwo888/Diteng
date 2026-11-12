/*
# Store admin password as a salted hash behind server-side functions

1. New Tables
- `admin_credentials`: holds exactly one row (id = 1) with the bcrypt hash of the admin password. The plain password is never stored.

2. Functions
- `admin_verify_password(p_password)`: returns true when the password matches the stored hash.
- `admin_change_password(p_old, p_new)`: changes the password only when the old one matches and the new one is at least 4 characters.

3. Security
- Row level security is enabled on `admin_credentials` with no policies and no grants to `anon` or `authenticated`, so the hash cannot be read through the data API.
- Both functions run with elevated rights but only expose a true/false result. They are callable by `anon` and `authenticated` because this app has no sign-in screen.

4. Notes
- The table starts empty. The initial password must be set once after this migration is applied; it is intentionally not written in this file.
- Functions use `SET search_path` to avoid search path hijacking.
*/

CREATE TABLE IF NOT EXISTS admin_credentials (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  password_hash text NOT NULL,
  updated_at bigint NOT NULL DEFAULT 0
);

ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON admin_credentials FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION admin_verify_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT password_hash INTO v_hash FROM admin_credentials WHERE id = 1;
  IF v_hash IS NULL OR p_password IS NULL THEN
    RETURN false;
  END IF;
  RETURN extensions.crypt(p_password, v_hash) = v_hash;
END;
$$;

CREATE OR REPLACE FUNCTION admin_change_password(p_old text, p_new text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_new IS NULL OR length(p_new) < 4 THEN
    RETURN false;
  END IF;
  IF NOT admin_verify_password(p_old) THEN
    RETURN false;
  END IF;
  UPDATE admin_credentials
  SET password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')),
      updated_at = (extract(epoch FROM now()) * 1000)::bigint
  WHERE id = 1;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_verify_password(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_change_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_verify_password(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_change_password(text, text) TO anon, authenticated;
