package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"dibs-network-backend/internal/network"
	"dibs-network-backend/internal/store"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Hub struct {
	store    *store.SpatialStore
	interval time.Duration
	mu       sync.Mutex
	clients  map[*websocket.Conn]struct{}
}

func NewHub(spatialStore *store.SpatialStore, interval time.Duration) *Hub {
	if interval <= 0 {
		interval = 10 * time.Second
	}
	return &Hub{
		store:    spatialStore,
		interval: interval,
		clients:  make(map[*websocket.Conn]struct{}),
	}
}

func (h *Hub) Handle(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	h.mu.Lock()
	h.clients[conn] = struct{}{}
	h.mu.Unlock()

	defer func() {
		h.mu.Lock()
		delete(h.clients, conn)
		h.mu.Unlock()
		_ = conn.Close()
	}()

	h.sendSnapshot(conn)

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (h *Hub) RunBroadcastLoop(stop <-chan struct{}) {
	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			h.broadcastSnapshot()
		}
	}
}

func (h *Hub) broadcastSnapshot() {
	nodes, err := h.store.ListNodes("active", false)
	if err != nil {
		log.Printf("ws snapshot: %v", err)
		return
	}
	if nodes == nil {
		nodes = []network.ListingNode{}
	}

	payload, err := json.Marshal(map[string]any{
		"type":  "nodes_snapshot",
		"nodes": nodes,
	})
	if err != nil {
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()
	for conn := range h.clients {
		if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
			_ = conn.Close()
			delete(h.clients, conn)
		}
	}
}

func (h *Hub) sendSnapshot(conn *websocket.Conn) {
	nodes, err := h.store.ListNodes("active", false)
	if err != nil {
		log.Printf("ws initial snapshot: %v", err)
		return
	}
	if nodes == nil {
		nodes = []network.ListingNode{}
	}

	payload, _ := json.Marshal(map[string]any{
		"type":  "nodes_snapshot",
		"nodes": nodes,
	})
	_ = conn.WriteMessage(websocket.TextMessage, payload)
}
