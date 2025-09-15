// Script to make a user admin after they sign up
import prisma from './src/prisma.js';

async function makeUserAdmin() {
  try {
    const adminEmail = 'admin@example.com';
    
    console.log(`🔍 Looking for user: ${adminEmail}`);
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: {
        accounts: {
          select: {
            providerId: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ User not found. Please sign up first with the mobile app.');
      console.log('\n📱 Sign up steps:');
      console.log('1. Open your mobile app');
      console.log('2. Go to SIGNUP screen');
      console.log(`3. Email: ${adminEmail}`);
      console.log('4. Password: admin123');
      console.log('5. Name: Admin User');
      console.log('6. Complete signup');
      console.log('7. Run this script again');
      return;
    }
    
    if (user.accounts.length === 0) {
      console.log('❌ User found but has no authentication. Please sign up through the app.');
      return;
    }
    
    if (user.role === 'admin') {
      console.log('✅ User is already an admin!');
    } else {
      // Update user to admin
      const updatedUser = await prisma.user.update({
        where: { email: adminEmail },
        data: { role: 'admin' }
      });
      
      console.log('✅ User updated to admin role!');
    }
    
    // Show final status
    console.log('\n👑 Admin User Details:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role === 'admin' ? 'admin' : 'user → admin (updated)'}`);
    console.log(`   Has Auth: ${user.accounts.length > 0 ? 'Yes' : 'No'}`);
    
    console.log('\n🎉 You can now login as admin:');
    console.log('1. Open your mobile app');
    console.log('2. Go to LOGIN screen');
    console.log(`3. Email: ${adminEmail}`);
    console.log('4. Password: admin123');
    console.log('5. You\'ll have admin privileges to create devotions!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeUserAdmin();





