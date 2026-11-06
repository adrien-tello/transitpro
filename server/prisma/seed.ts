// Demo data so everyone can log in and click around.
// Run: npm run db:seed   (after npm run db:migrate)
// Every demo account uses the password: Password123
import bcrypt from 'bcryptjs';
import { PrismaClient, type Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 12);

  const agency = await prisma.agency.upsert({
    where: { slug: 'etoile-voyages' },
    update: {},
    create: {
      name: 'Étoile Voyages',
      slug: 'etoile-voyages',
      status: 'APPROVED',
      verifiedAt: new Date(),
      headOffice: 'Douala, Akwa',
      phone: '+237600000000',
      email: 'contact@etoile.test',
      rccmNumber: 'RC/DLA/2019/B/0001',
      niuNumber: 'M000000000001X',
    },
  });

  const akwa = await prisma.branch.create({ data: { agencyId: agency.id, name: 'Akwa', city: 'Douala', address: 'Boulevard de la Liberté' } });
  await prisma.branch.create({ data: { agencyId: agency.id, name: 'Mvan', city: 'Yaoundé', address: 'Gare routière de Mvan' } });

  const people: { email: string; fullName: string; role: Role; jobTitle?: string }[] = [
    { email: 'admin@transitpro.test', fullName: 'Platform Admin', role: 'PLATFORM_ADMIN' },
    { email: 'owner@etoile.test', fullName: 'Agency Owner', role: 'AGENCY_OWNER', jobTitle: 'Owner' },
    { email: 'manager@etoile.test', fullName: 'Alice Ngo', role: 'BRANCH_MANAGER', jobTitle: 'Branch manager' },
    { email: 'agent@etoile.test', fullName: 'Carine Ndoumbe', role: 'COUNTER_AGENT', jobTitle: 'Counter agent' },
    { email: 'driver@etoile.test', fullName: 'Jean Fotso', role: 'DRIVER', jobTitle: 'Driver' },
    { email: 'courier@etoile.test', fullName: 'Bernard Atangana', role: 'COURIER', jobTitle: 'Courier' },
    { email: 'customer@transitpro.test', fullName: 'Marie Ekane', role: 'CUSTOMER' },
  ];

  for (const p of people) {
    const isStaff = p.role !== 'CUSTOMER' && p.role !== 'PLATFORM_ADMIN';
    await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        fullName: p.fullName,
        role: p.role,
        passwordHash,
        agencyId: isStaff ? agency.id : null,
        employee: isStaff ? { create: { agencyId: agency.id, branchId: akwa.id, jobTitle: p.jobTitle ?? p.role } } : undefined,
      },
    });
  }

  console.log('Seed done. Password for every account: Password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
