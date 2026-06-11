import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles } from 'lucide-react'
import api from '../utils/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  suggestions?: string[]
}

const QUICK_PROMPTS = [
  'How do I book an appointment?',
  'What are visiting hours?',
  'I have a headache and fever',
  'How to get my lab results?',
  'Which doctor for heart problems?',
]

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your MediCare Plus AI assistant. I can help you with appointments, finding the right doctor, understanding your prescriptions, and answering health-related questions. How can I help you today?", suggestions: QUICK_PROMPTS }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text?: string) => {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')

    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const history = newMessages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      const { data } = await api.post('/ai/chat', { message: userMsg, conversation_history: history.slice(0, -1) })
      setMessages([...newMessages, { role: 'assistant', content: data.response, suggestions: data.suggestions }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: "I'm sorry, I couldn't process your request right now. Please try again." }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <div className="font-display font-semibold text-gray-900">AI Medical Assistant</div>
          <div className="text-xs text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" /> Online</div>
        </div>
        <div className="ml-auto">
          <span className="text-xs text-gray-400 flex items-center gap-1"><Sparkles size={12} /> Powered by Claude</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-primary-500 to-purple-600' : 'bg-gray-200'}`}>
              {msg.role === 'assistant' ? <Bot size={16} className="text-white" /> : <User size={16} className="text-gray-600" />}
            </div>
            <div className={`max-w-[80%] space-y-2 ${msg.role === 'user' ? 'items-end' : ''} flex flex-col`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm' : 'bg-primary-600 text-white rounded-tr-sm'}`}>
                {msg.content}
              </div>
              {msg.suggestions && msg.suggestions.length > 0 && i === messages.length - 1 && (
                <div className="flex flex-wrap gap-2">
                  {msg.suggestions.map((s, si) => (
                    <button key={si} onClick={() => sendMessage(s)}
                      className="text-xs bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask me anything about your health..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
          className="btn-primary px-4 disabled:opacity-50">
          <Send size={16} />
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-2">Not a substitute for professional medical advice. Always consult your doctor.</p>
    </div>
  )
}
