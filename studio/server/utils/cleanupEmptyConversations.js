import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllConversations, deleteConversation } from './storage.js';

/**
 * Utility script to delete all empty conversations from the storage
 * This can be run manually or integrated into a periodic cleanup task
 */
async function cleanupEmptyConversations() {
  try {
    console.log('🧹 Starting cleanup of empty conversations...');
    
    // Get all conversations
    const conversations = await getAllConversations();
    
    // Count of empty conversations
    let emptyCount = 0;
    
    // Iterate through each conversation
    for (const conversation of conversations) {
      // Check if conversation has no messages or an empty messages array
      if (!conversation.messages || conversation.messages.length === 0) {
        console.log(`🗑️  Deleting empty conversation: ${conversation.id} (${conversation.title})`);
        await deleteConversation(conversation.id);
        emptyCount++;
      }
    }
    
    console.log(`✅ Cleanup complete. Deleted ${emptyCount} empty conversations.`);
    return emptyCount;
  } catch (error) {
    console.error('❌ Error cleaning up empty conversations:', error);
    throw error;
  }
}

// Allow the script to be run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cleanupEmptyConversations()
    .then(count => {
      console.log(`🧹 Cleanup script finished. Removed ${count} empty conversations.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

export default cleanupEmptyConversations; 