import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5001";

const socket = io(SOCKET_URL);

socket.on("connect", () => {
  console.log("Connected to Socket.IO server!");
  const conversationId = "test-playwright-conversation";
  const message = "Visit github.com using @Playwright and take a screenshot";

  console.log(`Sending message: "${message}" to conversation: ${conversationId}`);
  socket.emit("sendMessage", { message, conversationId });
});

socket.on("receiveMessage", (data) => {
  console.log("Received message:", data.content);
  console.log("Metadata:", data.metadata);
  socket.disconnect();
});

socket.on("error", (error) => {
  console.error("Socket error:", error);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected from Socket.IO server, reason:", reason);
});

// Handle potential long waits for response
setTimeout(() => {
  if (socket.connected) {
    console.log("Test timed out, disconnecting.");
    socket.disconnect();
  }
}, 60000); // 60 seconds timeout 