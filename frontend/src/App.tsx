import { useState, useEffect, useRef } from 'react'
import Editor, { OnMount } from "@monaco-editor/react"
import * as monaco from 'monaco-editor'
import './App.css'

function App() {
  const [editorContent, setEditorContent] = useState("")
  const [ws, setWs] = useState<WebSocket | null>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

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

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor

    // 補完機能の設定
    monacoInstance.languages.registerCompletionItemProvider('typescript', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }

        // サンプルの補完候補
        const suggestions = [
          {
            label: 'console.log',
            kind: monacoInstance.languages.CompletionItemKind.Function,
            insertText: 'console.log($0)',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'function',
            kind: monacoInstance.languages.CompletionItemKind.Keyword,
            insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'if',
            kind: monacoInstance.languages.CompletionItemKind.Keyword,
            insertText: 'if (${1:condition}) {\n\t$0\n}',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          },
          {
            label: 'async',
            kind: monacoInstance.languages.CompletionItemKind.Keyword,
            insertText: 'async ${1:function} ${2:name}(${3:params}) {\n\t$0\n}',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range
          }
        ]

        return { suggestions }
      }
    })

    // 診断機能の設定
    const markers: monaco.editor.IMarkerData[] = []
    const model = editor.getModel()
    if (model) {
      const content = model.getValue()
      // 簡単な診断例: console.logがある行にwarningを表示
      const lines = content.split('\n')
      lines.forEach((line, index) => {
        if (line.includes('console.log')) {
          markers.push({
            severity: monacoInstance.MarkerSeverity.Warning,
            message: 'Consider using a logger instead of console.log',
            startLineNumber: index + 1,
            startColumn: 1,
            endLineNumber: index + 1,
            endColumn: line.length + 1
          })
        }
      })
      monacoInstance.editor.setModelMarkers(model, 'typescript', markers)
    }

    // 定義へのジャンプ機能の設定
    monacoInstance.languages.registerDefinitionProvider('typescript', {
      provideDefinition: (model, position) => {
        // サンプルの定義位置
        const word = model.getWordAtPosition(position)
        if (word && word.word === 'example') {
          return {
            uri: model.uri,
            range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1
            }
          }
        }
        return null
      }
    })

    // ホバー機能の追加
    monacoInstance.languages.registerHoverProvider('typescript', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position)
        if (word) {
          // 特定のキーワードに対してホバー情報を提供
          const hoverContent: { [key: string]: string } = {
            'function': '関数を定義します。\n```typescript\nfunction name(params) {\n  // 処理\n}\n```',
            'console': 'コンソールオブジェクト。デバッグ情報の出力に使用します。',
            'async': '非同期関数を定義するためのキーワード。\n```typescript\nasync function name() {\n  await promise;\n}\n```'
          }

          if (word.word in hoverContent) {
            return {
              contents: [
                { value: hoverContent[word.word] }
              ]
            }
          }
        }
        return null
      }
    })
  }

  const handleEditorChange = (value: string | undefined) => {
    if (!value) return
    setEditorContent(value)
    
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
        defaultLanguage="typescript"
        value={editorContent}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          wordBasedSuggestions: "off"
        }}
      />
    </div>
  )
}

export default App
