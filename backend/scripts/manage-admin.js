import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcrypt';
import readline from 'readline';

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function listUsers() {
  const result = await pool.query(`
    SELECT id, username, email, role, business_id, is_active, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  
  console.log('\n📋 All Users:');
  console.log('='.repeat(80));
  result.rows.forEach((user, i) => {
    const business = user.business_id ? `Business: ${user.business_id}` : 'No business';
    console.log(`${i + 1}. ${user.username} (${user.email})`);
    console.log(`   Role: ${user.role} | ${business} | Active: ${user.is_active}`);
    console.log(`   ID: ${user.id}`);
    console.log('');
  });
  
  return result.rows;
}

async function changeUserRole() {
  const users = await listUsers();
  
  const username = await question('\nEnter username to modify: ');
  const user = users.find(u => u.username === username);
  
  if (!user) {
    console.log('❌ User not found!');
    return;
  }
  
  console.log(`\nCurrent user: ${user.username} (${user.email})`);
  console.log(`Current role: ${user.role}`);
  
  const newRole = await question('Enter new role (admin, manager, staff, viewer): ');
  
  if (!['admin', 'manager', 'staff', 'viewer'].includes(newRole)) {
    console.log('❌ Invalid role!');
    return;
  }
  
  const confirm = await question(`\nChange ${user.username} role from ${user.role} to ${newRole}? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }
  
  await pool.query(`
    UPDATE users
    SET role = $1, updated_at = NOW()
    WHERE id = $2
  `, [newRole, user.id]);
  
  console.log(`✅ Updated ${user.username} role to ${newRole}`);
}

async function resetPassword() {
  const users = await listUsers();
  
  const username = await question('\nEnter username to reset password: ');
  const user = users.find(u => u.username === username);
  
  if (!user) {
    console.log('❌ User not found!');
    return;
  }
  
  const newPassword = await question('Enter new password: ');
  const confirm = await question(`\nReset password for ${user.username}? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }
  
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);
  
  await pool.query(`
    UPDATE users
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `, [passwordHash, user.id]);
  
  console.log(`✅ Password reset for ${user.username}`);
  console.log(`   New password: ${newPassword}`);
}

async function toggleActive() {
  const users = await listUsers();
  
  const username = await question('\nEnter username to toggle active status: ');
  const user = users.find(u => u.username === username);
  
  if (!user) {
    console.log('❌ User not found!');
    return;
  }
  
  const newStatus = !user.is_active;
  const confirm = await question(`\n${newStatus ? 'Activate' : 'Deactivate'} ${user.username}? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    return;
  }
  
  await pool.query(`
    UPDATE users
    SET is_active = $1, updated_at = NOW()
    WHERE id = $2
  `, [newStatus, user.id]);
  
  console.log(`✅ ${user.username} is now ${newStatus ? 'active' : 'inactive'}`);
}

async function assignBusiness() {
  const users = await listUsers();
  
  // Get businesses
  const businesses = await pool.query('SELECT id, name FROM businesses ORDER BY name');
  
  if (businesses.rows.length === 0) {
    console.log('❌ No businesses found!');
    return;
  }
  
  console.log('\n📋 Businesses:');
  businesses.rows.forEach((b, i) => {
    console.log(`   ${i + 1}. ${b.name} (${b.id})`);
  });
  
  const username = await question('\nEnter username to assign business: ');
  const user = users.find(u => u.username === username);
  
  if (!user) {
    console.log('❌ User not found!');
    return;
  }
  
  const businessName = await question('Enter business name (or "none" to remove): ');
  
  let businessId = null;
  if (businessName.toLowerCase() !== 'none') {
    const business = businesses.rows.find(b => b.name.toLowerCase() === businessName.toLowerCase());
    if (!business) {
      console.log('❌ Business not found!');
      return;
    }
    businessId = business.id;
  }
  
  await pool.query(`
    UPDATE users
    SET business_id = $1, updated_at = NOW()
    WHERE id = $2
  `, [businessId, user.id]);
  
  console.log(`✅ Updated ${user.username} business assignment`);
}

async function main() {
  console.log('\n🔧 Admin Management Script\n');
  console.log('='.repeat(60));
  console.log('1. List all users');
  console.log('2. Change user role');
  console.log('3. Reset user password');
  console.log('4. Toggle user active status');
  console.log('5. Assign user to business');
  console.log('6. Exit');
  
  while (true) {
    const choice = await question('\nSelect option (1-6): ');
    
    try {
      switch (choice) {
        case '1':
          await listUsers();
          break;
        case '2':
          await changeUserRole();
          break;
        case '3':
          await resetPassword();
          break;
        case '4':
          await toggleActive();
          break;
        case '5':
          await assignBusiness();
          break;
        case '6':
          console.log('\n👋 Goodbye!');
          rl.close();
          await pool.end();
          process.exit(0);
        default:
          console.log('❌ Invalid option!');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  rl.close();
  process.exit(1);
});

