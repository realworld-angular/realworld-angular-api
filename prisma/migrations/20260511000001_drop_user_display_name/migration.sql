-- Drop displayName column from User (replaced by name column).
ALTER TABLE "User" DROP COLUMN IF EXISTS "displayName";
