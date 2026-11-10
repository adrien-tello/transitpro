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

  // Safe to run again: branches and users are only created when missing
  const branch = async (name: string, city: string, address: string) =>
    (await prisma.branch.findFirst({ where: { agencyId: agency.id, name } })) ??
    prisma.branch.create({ data: { agencyId: agency.id, name, city, address } });
  const akwa = await branch('Akwa', 'Douala', 'Boulevard de la Liberté');
  const mvan = await branch('Mvan', 'Yaoundé', 'Gare routière de Mvan');

  // Parcels travel Akwa (Douala) → Mvan (Yaoundé): the mvan.* accounts receive and deliver them
  const people: { email: string; fullName: string; role: Role; jobTitle?: string; branchId?: string }[] = [
    { email: 'admin@transitpro.test', fullName: 'Platform Admin', role: 'PLATFORM_ADMIN' },
    { email: 'owner@etoile.test', fullName: 'Agency Owner', role: 'AGENCY_OWNER', jobTitle: 'Owner' },
    { email: 'manager@etoile.test', fullName: 'Alice Ngo', role: 'BRANCH_MANAGER', jobTitle: 'Branch manager' },
    { email: 'agent@etoile.test', fullName: 'Carine Ndoumbe', role: 'COUNTER_AGENT', jobTitle: 'Counter agent' },
    { email: 'driver@etoile.test', fullName: 'Jean Fotso', role: 'DRIVER', jobTitle: 'Driver' },
    { email: 'courier@etoile.test', fullName: 'Bernard Atangana', role: 'COURIER', jobTitle: 'Courier', branchId: mvan.id },
    { email: 'mvan.agent@etoile.test', fullName: 'Paul Essomba', role: 'COUNTER_AGENT', jobTitle: 'Counter agent', branchId: mvan.id },
    { email: 'mvan.manager@etoile.test', fullName: 'Grace Mballa', role: 'BRANCH_MANAGER', jobTitle: 'Branch manager', branchId: mvan.id },
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
        employee: isStaff ? { create: { agencyId: agency.id, branchId: p.branchId ?? akwa.id, jobTitle: p.jobTitle ?? p.role } } : undefined,
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
