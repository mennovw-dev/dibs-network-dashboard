package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"dibs-network-mcp/internal/dockerlogs"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func main() {
	port := envOr("MCP_PORT", "8011")
	container := envOr("STAGING_CONTAINER", "dibs-staging-dibs-backend-1")
	logReader := dockerlogs.NewReader(container)

	server := mcp.NewServer(&mcp.Implementation{
		Name:    "dibs-network-mcp",
		Version: "0.1.0",
	}, nil)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "inspect_logs",
		Description: "Read recent logs from the Dibs staging backend container via Docker",
	}, func(ctx context.Context, _ *mcp.CallToolRequest, params *dockerlogs.InspectLogsParams) (*mcp.CallToolResult, any, error) {
		return logReader.Inspect(ctx, params)
	})

	handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server {
		return server
	}, nil)

	mux := http.NewServeMux()
	mux.Handle("/", handler)
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	addr := listenAddr(port)
	log.Printf("dibs-network-mcp listening on %s (staging container: %s)", addr, container)
	if err := http.ListenAndServe(addr, mux); err != nil {
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
	if os.Getenv("MCP_LISTEN_ALL") == "true" {
		return "0.0.0.0:" + port
	}
	return "127.0.0.1:" + port
}
