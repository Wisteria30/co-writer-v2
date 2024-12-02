package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 開発環境用に全てのオリジンを許可
	},
}

type Message struct {
	Type    string `json:"type"`
	Content string `json:"content"`
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		if msg.Type == "completion" {
			// 簡単な補完: "xx"を"xxx"に置換
			response := Message{
				Type:    "completion",
				Content: "xxx",
			}

			if err := conn.WriteJSON(response); err != nil {
				log.Printf("Error writing message: %v", err)
				break
			}
		}
	}
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)

	port := ":8081"
	log.Printf("Starting server on %s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
