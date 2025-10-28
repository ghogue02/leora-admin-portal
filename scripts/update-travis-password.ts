import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updateTravisPassword() {
  const email = 'travis@wellcrafted.com';
  const password = 'SalesDemo2025!';

  try {
    // Find Travis user
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);
    console.log(`Current password hash: ${user.hashedPassword.substring(0, 20)}...`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`New password hash: ${hashedPassword.substring(0, 20)}...`);

    // Update the password
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword }
    });

    console.log('✅ Password updated successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateTravisPassword();
