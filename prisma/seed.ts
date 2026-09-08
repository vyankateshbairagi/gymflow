import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Demo credentials for local testing only — change these (or delete the
// demo org entirely) before using this against a real gym's data.
const DEMO_OWNER_EMAIL = "owner@demogym.test";
const DEMO_STAFF_EMAIL = "staff@demogym.test";
const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const organization = await db.organization.upsert({
    where: { slug: "demo-gym" },
    update: {},
    create: {
      name: "Demo Gym",
      slug: "demo-gym",
      phone: "9999999999",
      email: "hello@demogym.test",
    },
  });

  await db.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: DEMO_OWNER_EMAIL,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Demo Owner",
      email: DEMO_OWNER_EMAIL,
      passwordHash,
      role: "OWNER",
    },
  });

  await db.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: DEMO_STAFF_EMAIL,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      name: "Demo Staff",
      email: DEMO_STAFF_EMAIL,
      passwordHash,
      role: "STAFF",
    },
  });

  console.log("Seeded demo organization and users:");
  console.log(`  Owner: ${DEMO_OWNER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Staff: ${DEMO_STAFF_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
