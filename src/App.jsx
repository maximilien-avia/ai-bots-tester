import { useEffect, useMemo, useState } from 'react'

const starterMessages = [
  { id: 1, sender: 'other', text: 'Salut ! 🎉', time: '09:10' },
  { id: 2, sender: 'other', text: 'Ça va ? Je suis prêt à discuter.', time: '09:11' },
]

const quickReplies = ['Salut !', 'Tu es là ?', 'On continue ?']

function App() {
  const [messages, setMessages] = useState(starterMessages)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)

  const lastSeen = useMemo(() => {
    const now = new Date()
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL

  useEffect(() => {
    document.title = 'Chat privé'
  }, [])

  const sendMessage = async (text) => {
    const trimmed = text.trim()

    if (!trimmed || isSending) return

    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const newMessage = {
      id: crypto.randomUUID(),
      sender: 'me',
      text: trimmed,
      time: timeLabel,
    }

    setMessages((current) => [...current, newMessage])
    setDraft('')
    setIsSending(true)

    if (!n8nWebhookUrl) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: 'other',
          text: 'Webhook n8n non configuré. Ajoute VITE_N8N_WEBHOOK_URL dans le fichier .env.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
      setIsSending(false)
      return
    }

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          from: 'demo-react',
          conversationId: 'demo-chat',
        }),
      })

      const responseText = await response.text()

      if (!response.ok) {
        console.error('Webhook n8n HTTP error', response.status, responseText)
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            sender: 'other',
            text: `Erreur webhook n8n (${response.status}) : ${responseText}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        setIsSending(false)
        return
      }

      let data = {}

      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Webhook n8n non-JSON response', responseText)
        data = {}
      }

      const botReply = data.reply || data.body || data.message || responseText || 'Aucune réponse reçue de n8n.'

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: 'other',
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (error) {
      console.error('Fetch error', error)
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: 'other',
          text: `Erreur de connexion au bot n8n. ${error.message || 'Vérifie l’URL, la CORS et la disponibilité du webhook.'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="app-shell">
      <section className="chat-window" aria-label="Conversation WhatsApp">
        <header className="chat-header">
          <div className="avatar">A</div>
          <div className="contact">
            <h1>Alex</h1>
            <p>En ligne · Dernière activité à {lastSeen}</p>
          </div>
          <div className="status-pill">Privé</div>
        </header>

        <div className="chat-body" aria-live="polite">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`message ${message.sender === 'me' ? 'outgoing' : 'incoming'}`}
            >
              <p>{message.text}</p>
              <span>{message.time}</span>
            </article>
          ))}
        </div>

        <div className="quick-replies" aria-label="Réponses rapides">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => sendMessage(reply)}
              disabled={isSending}
            >
              {reply}
            </button>
          ))}
        </div>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault()
            sendMessage(draft)
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Écris un message..."
            aria-label="Message"
            disabled={isSending}
          />
          <button type="submit" disabled={isSending}>{isSending ? 'Envoi...' : 'Envoyer'}</button>
        </form>
      </section>
    </div>
  )
}

export default App
