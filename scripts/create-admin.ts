/**
 * Admin User Creation Script
 * 
 * This script creates an admin user in the database.
 * Usage: npm run create-admin
 * 
 * Security: This script should only be run by authorized personnel
 * with direct database access.
 */

import postgres from 'postgres';
import bcrypt from 'bcrypt';
import readline from 'readline';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
function isValidPassword(password: string): boolean {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

async function createAdminUser() {
  console.log('\n🔐 StudyForge Admin User Creation Script\n');
  console.log('This script will create a new admin user or promote an existing user to admin.\n');

  let connection: any;

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('PostgreSQL credentials missing. Please set DATABASE_URL in .env file');
    }

    // Create database connection
    console.log('📡 Connecting to database...\n');
    connection = postgres(databaseUrl);

    console.log('✅ Connected to database\n');

    // Get user input
    const email = await question('Enter admin email: ');
    
    if (!isValidEmail(email)) {
      console.error('❌ Invalid email format!');
      rl.close();
      await connection.end();
      process.exit(1);
    }

    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    ) as any;

    if (existingUsers.length > 0) {
      // User exists - ask if they want to promote to admin
      const user = existingUsers[0];
      
      if (user.role === 'admin') {
        console.log('\n✅ User is already an admin!');
        console.log(`Username: ${user.username}`);
        console.log(`Email: ${user.email}`);
        rl.close();
        await connection.end();
        process.exit(0);
      }

      console.log(`\n⚠️  User exists with role: ${user.role}`);
      const promote = await question('Do you want to promote this user to admin? (yes/no): ');
      
      if (promote.toLowerCase() === 'yes' || promote.toLowerCase() === 'y') {
        // Promote existing user to admin
        await connection.execute(
          'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
          ['admin', user.id]
        );

        console.log('\n✅ User promoted to admin successfully!');
        console.log(`Username: ${user.username}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: admin`);
        
        rl.close();
        await connection.end();
        process.exit(0);
      } else {
        console.log('\n❌ Operation cancelled.');
        rl.close();
        await connection.end();
        process.exit(0);
      }
    }

    // User doesn't exist - create new admin user
    console.log('\n📝 Creating new admin user...\n');

    const username = await question('Enter username: ');
    
    if (username.length < 3) {
      console.error('❌ Username must be at least 3 characters!');
      rl.close();
      await connection.end();
      process.exit(1);
    }

    // Check if username is taken
    const [existingUsername] = await connection.execute(
      'SELECT * FROM users WHERE username = ? LIMIT 1',
      [username]
    ) as any;

    if (existingUsername.length > 0) {
      console.error('❌ Username already taken!');
      rl.close();
      await connection.end();
      process.exit(1);
    }

    const fullName = await question('Enter full name (optional): ');
    const password = await question('Enter password (min 8 chars, 1 uppercase, 1 lowercase, 1 number): ');

    if (!isValidPassword(password)) {
      console.error('❌ Password does not meet requirements!');
      console.error('   - At least 8 characters');
      console.error('   - At least 1 uppercase letter');
      console.error('   - At least 1 lowercase letter');
      console.error('   - At least 1 number');
      rl.close();
      await connection.end();
      process.exit(1);
    }

    const confirmPassword = await question('Confirm password: ');

    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match!');
      rl.close();
      await connection.end();
      process.exit(1);
    }

    // Hash password
    console.log('\n🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    console.log('👤 Creating admin user...');
    await connection.execute(
      `INSERT INTO users (username, email, password, full_name, role, is_active, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', 1, 1, NOW(), NOW())`,
      [username, email, hashedPassword, fullName || null]
    );

    console.log('\n✅ Admin user created successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📋 Admin User Details:');
    console.log('═══════════════════════════════════════');
    console.log(`Username:       ${username}`);
    console.log(`Email:          ${email}`);
    console.log(`Full Name:      ${fullName || 'Not provided'}`);
    console.log(`Role:           admin`);
    console.log(`Email Verified: true`);
    console.log(`Status:         active`);
    console.log('═══════════════════════════════════════\n');
    console.log('🎉 You can now login with these credentials at /admin\n');

    rl.close();
    await connection.end();
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error creating admin user:', error.message);
    if (connection) await connection.end();
    rl.close();
    process.exit(1);
  }
}

// Run the script
createAdminUser();
