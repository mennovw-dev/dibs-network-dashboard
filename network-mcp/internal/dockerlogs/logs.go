package dockerlogs

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strconv"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	defaultTail = 100
	maxTail     = 1000
)

type InspectLogsParams struct {
	Tail       int    `json:"tail" jsonschema:"Number of log lines to return (default 100, max 1000)"`
	Since      string `json:"since,omitempty" jsonschema:"Only logs since this RFC3339 timestamp or duration like 1h"`
	Timestamps bool   `json:"timestamps,omitempty" jsonschema:"Include Docker timestamps in output"`
}

type Reader struct {
	container string
}

func NewReader(container string) *Reader {
	return &Reader{container: container}
}

func (r *Reader) Inspect(ctx context.Context, params *InspectLogsParams) (*mcp.CallToolResult, any, error) {
	tail := defaultTail
	timestamps := false
	since := ""

	if params != nil {
		if params.Tail > 0 {
			tail = params.Tail
		}
		timestamps = params.Timestamps
		since = params.Since
	}
	if tail > maxTail {
		tail = maxTail
	}

	args := []string{"logs", "--tail", strconv.Itoa(tail)}
	if timestamps {
		args = append(args, "--timestamps")
	}
	if since != "" {
		args = append(args, "--since", since)
	}
	args = append(args, r.container)

	cmd := exec.CommandContext(ctx, "docker", args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		msg := stderr.String()
		if msg == "" {
			msg = err.Error()
		}
		return nil, nil, fmt.Errorf("docker logs for %q: %s", r.container, msg)
	}

	text := stdout.String()
	if text == "" {
		text = "(no log output)"
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			&mcp.TextContent{Text: text},
		},
	}, map[string]any{
		"container": r.container,
		"tail":      tail,
		"since":     since,
	}, nil
}
