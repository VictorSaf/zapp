const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Create a test JWT token
const testToken = jwt.sign(
  { 
    userId: 'test-user-123', 
    email: 'test@example.com' 
  }, 
  'your-super-secret-jwt-key-change-this-in-production', // This should match your config
  { expiresIn: '1h' }
);

console.log('Test JWT Token:', testToken);

// Test Socket.io connection
const socket = io('http://localhost:3000', {
  auth: {
    token: testToken
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to ZAEUS WebSocket server');
  console.log('Socket ID:', socket.id);
  
  // Test joining a conversation
  socket.emit('join-conversation', 'test-conversation-123');
  
  // Test sending a message after a short delay
  setTimeout(() => {
    socket.emit('send-message', {
      conversationId: 'test-conversation-123',
      content: 'Hello from test client!',
      agentId: 'agent_00z'
    });
  }, 1000);
  
  // Disconnect after testing
  setTimeout(() => {
    console.log('Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 3000);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('connection-established', (data) => {
  console.log('🎉 Connection established:', data);
});

socket.on('message-received', (data) => {
  console.log('💬 Message received:', data);
});

socket.on('user-joined-conversation', (data) => {
  console.log('👥 User joined conversation:', data);
});

socket.on('message-error', (data) => {
  console.log('❌ Message error:', data);
});

setTimeout(() => {
  console.log('Test timeout - exiting');
  process.exit(1);
}, 10000);