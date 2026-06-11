package main

import (
	"log"
	"net/http"
	"os"

	"dibs-network-backend/internal/db"
	"dibs-network-backend/internal/handlers"
	"dibs-network-backend/internal/store"

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

	router := gin.New()
	router.Use(gin.Recovery())

	router.GET("/health", func(c *gin.Context) {
		c.String(http.StatusOK, "ok")
	})

	api := router.Group("/api/v1")
	{
		api.GET("/spatial/nodes", spatialHandler.ListNodes)
		api.GET("/spatial/overlap", spatialHandler.Overlap)
	}

	addr := listenAddr(port)
	log.Printf("dibs-network-backend listening on %s (db: %s)", addr, dbPath)
	if err := router.Run(addr); err != nil {
		log.Fatalf("server failed: %v", err)
	}
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
