import fetch from 'node-fetch';

const API_URL = 'http://localhost:3002/api/auth/login';

async function testLogin(username, password, expectedRole) {
  try {
    console.log(`\nTesting login for: ${username}...`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.log(`   ❌ Non-JSON response (${response.status}): ${text.substring(0, 100)}`);
      return false;
    }

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`   ✅ Login successful!`);
      console.log(`   Username: ${data.user.username}`);
      console.log(`   Role: ${data.user.role}`);
      console.log(`   Business: ${data.business ? data.business.name : 'None (Super Admin)'}`);
      console.log(`   Token: ${data.token ? data.token.substring(0, 20) + '...' : 'None'}`);
      
      if (data.user.role === expectedRole) {
        console.log(`   ✅ Role matches expected: ${expectedRole}`);
      } else {
        console.log(`   ⚠️  Role mismatch! Expected: ${expectedRole}, Got: ${data.user.role}`);
      }
      
      return true;
    } else {
      console.log(`   ❌ Login failed: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`   ❌ Server not running on port 3002`);
      console.log(`   Please start the server with: npm run server`);
    } else {
      console.log(`   ❌ Error: ${error.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Login Functionality\n');
  console.log('=' .repeat(50));
  
  // Test super admin
  const superAdminSuccess = await testLogin('superadmin', 'password123', 'super_admin');
  
  // Test novagadget user
  const novagadgetSuccess = await testLogin('novagadget', 'novagadget123', 'admin');
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Results:');
  console.log(`   Super Admin Login: ${superAdminSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   NovaGadget Login: ${novagadgetSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (superAdminSuccess && novagadgetSuccess) {
    console.log('\n✅ All login tests passed!');
  } else {
    console.log('\n❌ Some login tests failed. Check the errors above.');
  }
}

main().catch(console.error);
