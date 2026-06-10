import { useEffect, useMemo, useState } from 'react'

const starterMessages = [
  { id: 1, sender: 'other', text: 'Salut ! 🎉', time: '09:10' },
  { id: 2, sender: 'other', text: 'Ça va ? Je suis prêt à discuter.', time: '09:11' },
]

const quickReplies = ['Salut !', 'Je voudrai rejoindre Kretzclub', 'Mon email est : ']

const users = [
  { id: 'alice', name: 'Alice', initials: 'A', phone: '33624473153' },
  { id: 'bob', name: 'Bob', initials: 'B', phone: '33778150003' },
  { id: 'charlie', name: 'Charlie', initials: 'C', phone: '33655667788' },
]

const formatPhone = (phone) => {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('33') && d.length === 11) {
    const l = d.slice(2)
    return `+33 ${l[0]} ${l.slice(1,3)} ${l.slice(3,5)} ${l.slice(5,7)} ${l.slice(7,9)}`
  }
  return `+${d}`
}

function App() {
  const [conversations, setConversations] = useState(() => {
    const initial = {}

    users.forEach((user) => {
      initial[user.id] = starterMessages.map((message, index) => ({
        ...message,
        id: `${user.id}-${index}-${message.id}`,
      }))
    })

    return initial
  })
  const [selectedUserId, setSelectedUserId] = useState(users[0].id)
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const lastSeen = useMemo(() => {
    const now = new Date()
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [])

  const selectedUser = users.find((user) => user.id === selectedUserId)
  const messages = conversations[selectedUserId] ?? []
  const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL
  const n8nResetUrl = import.meta.env.VITE_N8N_RESET_URL

  useEffect(() => {
    document.title = 'Chat privé'
  }, [])

  const sendMessage = async (text) => {
    const trimmed = text.trim()

    if (!trimmed || isSending || !selectedUser) return

    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const sentMessage = {
      id: crypto.randomUUID(),
      sender: 'me',
      text: trimmed,
      time: timeLabel,
    }

    setConversations((current) => ({
      ...current,
      [selectedUser.id]: [...(current[selectedUser.id] ?? []), sentMessage],
    }))
    setDraft('')
    setIsSending(true)

    if (!n8nWebhookUrl) {
      setConversations((current) => ({
        ...current,
        [selectedUser.id]: [
          ...(current[selectedUser.id] ?? []),
          {
            id: crypto.randomUUID(),
            sender: 'other',
            text: 'Webhook n8n non configuré. Ajoute VITE_N8N_WEBHOOK_URL dans le fichier .env.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      }))
      setIsSending(false)
      return
    }

    try {
      const selectedPhone = selectedUser?.phone ?? '33778150001'

      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          from: selectedPhone,
          conversationId: `${selectedPhone}@s.whatsapp.net`,
        }),
      })

      const responseText = await response.text()

      if (!response.ok) {
        console.error('Webhook n8n HTTP error', response.status, responseText)
        setConversations((current) => ({
          ...current,
          [selectedUser.id]: [
            ...(current[selectedUser.id] ?? []),
            {
              id: crypto.randomUUID(),
              sender: 'other',
              text: `Erreur webhook n8n (${response.status}) : ${responseText}`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        }))
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

      setConversations((current) => ({
        ...current,
        [selectedUser.id]: [
          ...(current[selectedUser.id] ?? []),
          {
            id: crypto.randomUUID(),
            sender: 'other',
            text: botReply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      }))
    } catch (error) {
      console.error('Fetch error', error)
      setConversations((current) => ({
        ...current,
        [selectedUser.id]: [
          ...(current[selectedUser.id] ?? []),
          {
            id: crypto.randomUUID(),
            sender: 'other',
            text: `Erreur de connexion au bot n8n. ${error.message || 'Vérifie l’URL, la CORS et la disponibilité du webhook.'}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      }))
    } finally {
      setIsSending(false)
    }
  }

  const resetConversation = async () => {
    if (isResetting || !selectedUser) return
    setIsResetting(true)

    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    try {
      const response = await fetch(n8nResetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selectedUser.phone }),
      })

      const responseText = await response.text()
      let data = {}
      try { data = JSON.parse(responseText) } catch { /* réponse non-JSON */ }

      const systemText = response.ok
        ? `Historique réinitialisé — ${data.rows_anonymized ?? 0} message(s) anonymisé(s) sous l'ID #${data.anonymous_id ?? '?'}.`
        : `Erreur lors de la réinitialisation (${response.status}) : ${responseText.slice(0, 120)}`

      setConversations((current) => ({
        ...current,
        [selectedUser.id]: [
          ...starterMessages.map((m, i) => ({ ...m, id: `${selectedUser.id}-reset-${i}` })),
          { id: crypto.randomUUID(), sender: 'system', text: systemText, time: timeLabel },
        ],
      }))
    } catch (error) {
      const timeErr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setConversations((current) => ({
        ...current,
        [selectedUser.id]: [
          ...(current[selectedUser.id] ?? []),
          { id: crypto.randomUUID(), sender: 'system', text: `Erreur de connexion : ${error.message}`, time: timeErr },
        ],
      }))
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="app-shell">
      <section className="chat-window" aria-label="Conversation WhatsApp">
        <header className="chat-header">
          <div className="avatar">{selectedUser?.initials ?? 'U'}</div>
          <div className="contact">
            <h1>{selectedUser?.name ?? 'Utilisateur'}</h1>
            <p>{formatPhone(selectedUser?.phone ?? '')} · En ligne à {lastSeen}</p>
          </div>
          <div className="status-pill">Privé</div>
          <button
            type="button"
            className="reset-btn"
            onClick={resetConversation}
            disabled={isResetting || isSending}
            title="Anonymiser l'historique et désactiver WhatsApp dans Brevo"
          >
            {isResetting ? '...' : 'Réinitialiser'}
          </button>
        </header>

        <div className="user-selector" aria-label="Sélecteur d'utilisateur">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className={user.id === selectedUserId ? 'active' : ''}
              onClick={() => setSelectedUserId(user.id)}
            >
              {user.name} <span className="user-phone">{formatPhone(user.phone)}</span>
            </button>
          ))}
        </div>

        <div className="chat-body" aria-live="polite">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`message ${message.sender === 'me' ? 'outgoing' : message.sender === 'system' ? 'system' : 'incoming'}`}
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
            placeholder={`Message pour ${selectedUser?.name ?? 'l’utilisateur'}...`}
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
