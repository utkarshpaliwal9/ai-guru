import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function testAlfaAPI() {
  console.log('🧪 Testing Alfa API directly...');
  console.log('📋 Configuration:');
  console.log('  Host:', process.env.ALFA_CHAT_HOST);
  console.log('  Token:', process.env.ALFA_AUTH_TOKEN?.substring(0, 10) + '...');
  console.log('  Project:', process.env.ALFA_PROJECT_ID);
  
  try {
    const apiClient = axios.create({
      baseURL: process.env.ALFA_CHAT_HOST.replace('/completions', ''),
      headers: {
        'Authorization': `Bearer ${process.env.ALFA_AUTH_TOKEN}`,
        'x-claim': process.env.ALFA_PROJECT_ID,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('\n🚀 Making API request...');
    const startTime = Date.now();
    
    const response = await apiClient.post('/completions', {
      model: process.env.ALFA_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello! This is a test message. Please respond briefly.' }
      ],
      max_tokens: 100,
      temperature: 0.7
    });

    const latency = Date.now() - startTime;
    
    console.log('✅ Success!');
    console.log('⏱️ Latency:', latency + 'ms');
    console.log('🤖 Response:', response.data.choices?.[0]?.message?.content);
    console.log('📊 Usage:', response.data.usage);
    
  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', error.response.data);
      console.error('Response Headers:', error.response.headers);
    }
    
    if (error.config) {
      console.error('Request URL:', error.config.url);
      console.error('Request Method:', error.config.method);
      console.error('Request Headers:', error.config.headers);
    }
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
}

// Run the test
testAlfaAPI(); 