-- Add PIN column to users table for business admin operations
-- PIN is used to verify sensitive operations (add/edit/delete)

ALTER TABLE users ADD COLUMN pin_hash TEXT;

-- Create index for PIN lookups (though we'll verify via user_id)
CREATE INDEX IF NOT EXISTS idx_users_pin ON users(id, pin_hash);

