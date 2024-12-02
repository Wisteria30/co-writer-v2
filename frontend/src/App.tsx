import { useState, useEffect } from 'react'
import Editor from "@monaco-editor/react"
import './App.css'

function App() {
  const [editorContent, setEditorContent] = useState("")
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:8081/ws')
    
    websocket.onopen = () => {
      console.log('Connected to WebSocket')
    }

    websocket.onmessage = (event) => {
      const response = JSON.parse(event.data)
      if (response.type === 'completion') {
        setEditorContent(prev => prev + response.content)
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    setWs(websocket)

    return () => {
      websocket.close()
    }
  }, [])

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return
    setEditorContent(value)
    
    // "xx"が入力されたら補完リクエストを送信
    if (value.includes('xx')) {
      ws?.send(JSON.stringify({
        type: 'completion',
        content: value
      }))
    }
  }

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Editor
        height="90vh"
        defaultLanguage="json"
        value={editorContent}
        onChange={handleEditorChange}
        theme="vs-dark"
      />
    </div>
  )
}

export default App
