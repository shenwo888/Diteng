/*
# Auto-initialize factory default admin password

1. Behavior
- When the admin_credentials table is empty (new deployment), the default factory password is stored as a salted hash automatically the first time the password is checked.
- Once an administrator changes the password, the stored hash is replaced, so the default stops working.

2. Functions
- `admin_ensure_default_password()`: internal helper that inserts the default hash only if no row exists. Not callable by browsers.
- `admin_verify_password(p_password)` and `admin_change_password(p_old, p_new)` now call the helper first.

3. Security
- The helper is revoked from PUBLIC, anon and authenticated. Plain passwords are never stored; only bcrypt hashes are written.
*/

CREATE OR REPLACE FUNCTION admin_ensure_default_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO admin_credentials (id, password_hash, updated_at)
  VALUES (1, extensions.crypt('888888', extensions.gen_salt('bf')), 0)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_ensure_default_password() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION admin_verify_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  PERFORM admin_ensure_default_password();
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
