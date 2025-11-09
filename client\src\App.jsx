import React, { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'

export default function App(){
  const [connected, setConnected] = useState(false)
  const [nick, setNick] = useState('')
  const [room, setRoom] = useState('main')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [typingUsers, setTypingUsers] = useState([])

  const socketRef = useRef(null)

  useEffect(()=>{
    const s = io(SOCKET_URL)
    socketRef.current = s

    s.on('connect', ()=> setConnected(true))
    s.on('disconnect', ()=> setConnected(false))
    s.on('history', (hist) => setMessages(hist))
    s.on('message', (m) => setMessages(prev => [...prev, m]))
    s.on('system', (text) => setMessages(prev => [...prev, { system: true, text, ts: new Date().toISOString() }]))
    s.on('typing', ({ nick, typing }) => {
      setTypingUsers(prev => typing ? Array.from(new Set([...prev, nick])) : prev.filter(n => n !== nick))
    })
    return () => s.disconnect()
  }, [])

  function join(){
    socketRef.current.emit('join', { room, nick })
  }

  function sendMessage(e){
    e.preventDefault()
    if (!text.trim()) return
    socketRef.current.emit('message', { text })
    setText('')
    socketRef.current.emit('typing', false)
  }

  useEffect(()=>{
    const timeout = setTimeout(()=>{
      if (text) socketRef.current.emit('typing', true)
      else socketRef.current.emit('typing', false)
    }, 200)
    return ()=> clearTimeout(timeout)
  }, [text])

  return (
    <div className="app">
      <header>
        <h1>Realtime Chat</h1>
        <div className="status">Status: {connected ? 'Connected' : 'Disconnected'}</div>
      </header>
      <section className="controls">
        <input placeholder="Nickname" value={nick} onChange={e=>setNick(e.target.value)} />
        <input placeholder="Room" value={room} onChange={e=>setRoom(e.target.value)} />
        <button onClick={join}>Join</button>
      </section>
      <main className="chat">
        <div className="messages">
          {messages.map((m, i) => (
            m.system ? (
              <div key={i} className="message system">{m.text}</div>
            ) : (
              <div key={m.id || i} className="message">
                <div className="meta">{m.nick} <span className="time">{new Date(m.ts).toLocaleTimeString()}</span></div>
                <div className="text">{m.text}</div>
              </div>
            )
          ))}
        </div>
        <div className="typing">{typingUsers.length ? `${typingUsers.join(', ')} typing...` : ''}</div>
        <form className="composer" onSubmit={sendMessage}>
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" />
          <button type="submit">Send</button>
        </form>
      </main>
    </div>
  )
}
