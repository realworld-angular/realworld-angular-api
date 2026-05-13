-- Rename Role enum value CLIENT -> CUSTOMER by replacing the PostgreSQL enum type.

CREATE TYPE "Role_new" AS ENUM ('CUSTOMER', 'PIZZERIA_ADMIN', 'PIZZAIOLO');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE
    WHEN "role"::text = 'CLIENT' THEN 'CUSTOMER'::"Role_new"
    WHEN "role"::text = 'PIZZERIA_ADMIN' THEN 'PIZZERIA_ADMIN'::"Role_new"
    WHEN "role"::text = 'PIZZAIOLO' THEN 'PIZZAIOLO'::"Role_new"
    ELSE 'CUSTOMER'::"Role_new"
  END
);

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER'::"Role_new";

DROP TYPE "Role";

ALTER TYPE "Role_new" RENAME TO "Role";
