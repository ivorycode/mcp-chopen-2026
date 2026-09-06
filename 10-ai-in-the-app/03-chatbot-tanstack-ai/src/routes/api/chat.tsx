import { createFileRoute } from '@tanstack/react-router'
import { handleChatRequest } from '../../features/chat/server/chat-route.server.ts'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: ({ request }) => handleChatRequest(request),
    },
  },
})
