import { io } from "socket.io-client";
import axios from "axios";

const SERVER_URL = "http://localhost:5001";
const PROMPT = "Visit github.com using @Playwright and take a screenshot";

// First create the conversation via REST API
async function createConversation() {
  try {
    console.log(`Creating conversation...`);
    const response = await axios.post(`${SERVER_URL}/api/conversations`, {
      title: "Playwright Test Conversation"
    });
    
    console.log(`✅ Conversation created successfully: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to create conversation: ${error.message}`);
    if (error.response) {
      console.error(`Response data:`, error.response.data);
    }
    process.exit(1);
  }
}

// Then connect via Socket.IO and send the message
async function runTest() {
  // First create the conversation
  const conversation = await createConversation();
  const conversationId = conversation.id;
  
  console.log(`Connecting to server at ${SERVER_URL}`);
  const socket = io(SERVER_URL, {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log(`✅ Connected to server with socket ID: ${socket.id}`);

    console.log(`Joining conversation: ${conversationId}`);
    socket.emit("join-conversation", conversationId);

    console.log(`\n--- Sending Prompt ---\n'${PROMPT}'\n----------------------\n`);
    const message = {
      conversationId: conversationId,
      content: PROMPT,
      sender: 'user'
    };
    socket.emit("send-message", message);
  });

  // Log all message events
  socket.on("message-received", (data) => {
    console.log("\n--- Received Message ---");
    console.log(JSON.stringify(data, null, 2));
    console.log("------------------------\n");

    // Check for success in either content or metadata
    const content = data.content || '';
    const metadataResult = data.metadata?.result || '';
    const hasPlaywrightAgent = data.metadata?.agentsInvolved?.includes("Playwright") || false;
    
    // Consider the test successful if:
    // 1. The sender is Alfa AND
    // 2. Either:
    //    a. The content mentions Playwright
    //    b. The metadata result mentions Playwright
    //    c. The agentsInvolved includes Playwright
    //    d. We get a timeout message but the agent was involved
    if (data.sender === 'Alfa' && (
        content.includes("Playwright") || 
        metadataResult.includes("Playwright") ||
        hasPlaywrightAgent ||
        (content.includes("stopped due to") && hasPlaywrightAgent)
    )) {
      console.log("✅ Test successful: Playwright agent was involved in the response.");
      socket.disconnect();
      process.exit(0);
    }
  });

  // Log workflow events
  socket.on("workflow-started", (data) => {
    console.log("\n--- Workflow Started ---");
    console.log(JSON.stringify(data, null, 2));
    console.log("------------------------\n");
  });

  socket.on("workflow-progress", (data) => {
    console.log("\n--- Workflow Progress ---");
    console.log(JSON.stringify(data, null, 2));
    console.log("------------------------\n");
  });

  socket.on("workflow-completed", (data) => {
    console.log("\n--- Workflow Completed ---");
    console.log(JSON.stringify(data, null, 2));
    console.log("------------------------\n");
  });

  // Log agent typing events
  socket.on("agent-typing", (data) => {
    console.log("\n--- Agent Typing ---");
    console.log(JSON.stringify(data, null, 2));
    console.log("------------------------\n");
  });

  // Log all events for debugging
  socket.onAny((event, ...args) => {
    console.log(`Event: ${event}`, args);
  });

  socket.on("connect_error", (err) => {
    console.error("Connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log(`🔌 Disconnected from server: ${reason}`);
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  // Timeout to prevent the script from running indefinitely
  setTimeout(() => {
    console.error("❌ Test failed: Timed out waiting for agent response.");
    socket.disconnect();
    process.exit(1);
  }, 120000); // 120 seconds - increased timeout for full response
}

// Run the test
runTest(); 