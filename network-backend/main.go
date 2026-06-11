package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"dibs-network-backend/internal/db"
	"dibs-network-backend/internal/handlers"
	"dibs-network-backend/internal/middleware"
	"dibs-network-backend/internal/store"
	"dibs-network-backend/internal/ws"

	"github.com/gin-gonic/gin"
)

func main() {
	dbPath := envOr("DATABASE_PATH", "/app/dibs-staging.db")
	port := envOr("PORT", "8010")
	gin.SetMode(envOr("GIN_MODE", "release"))

	database, err := db.OpenReadOnly(dbPath)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	spatialStore := store.NewSpatialStore(database)
	spatialHandler := handlers.NewSpatialHandler(spatialStore)
	hub := ws.NewHub(spatialStore, 10*time.Second)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go hub.RunBroadcastLoop(ctx.Done())

	router := gin.New()
	router.Use(gin.Recovery(), middleware.CORS())

	router.GET("/health", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})
	router.GET("/ws", hub.Handle)

	api := router.Group("/api/v1")
	{
		api.GET("/spatial/nodes", spatialHandler.ListNodes)
		api.GET("/spatial/overlap", spatialHandler.Overlap)
	}

	addr := listenAddr(port)
	log.Printf("dibs-network-backend listening on %s (db: %s)", addr, dbPath)

	srv := &http.Server{Addr: addr, Handler: router}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func listenAddr(port string) string {
	if os.Getenv("LISTEN_ALL") == "true" {
		return "0.0.0.0:" + port
	}
	return "127.0.0.1:" + port
}
