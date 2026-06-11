package backend

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type SpatialNodesParams struct {
	Status          string `json:"status" jsonschema:"Listing status filter (default active)"`
	WithCoordinates bool   `json:"with_coordinates" jsonschema:"Only return nodes that have map coordinates"`
}

type SpatialOverlapParams struct {
	MinLat float64 `json:"min_lat" jsonschema:"Minimum latitude (required)"`
	MaxLat float64 `json:"max_lat" jsonschema:"Maximum latitude (required)"`
	MinLon float64 `json:"min_lon" jsonschema:"Minimum longitude (required)"`
	MaxLon float64 `json:"max_lon" jsonschema:"Maximum longitude (required)"`
}

func (c *Client) SpatialNodes(ctx context.Context, _ *mcp.CallToolRequest, params *SpatialNodesParams) (*mcp.CallToolResult, any, error) {
	q := url.Values{}
	status := "active"
	withCoords := false
	if params != nil {
		if params.Status != "" {
			status = params.Status
		}
		withCoords = params.WithCoordinates
	}
	q.Set("status", status)
	if withCoords {
		q.Set("with_coordinates", "true")
	}

	return c.getJSON(ctx, "/api/v1/spatial/nodes?"+q.Encode())
}

func (c *Client) SpatialOverlap(ctx context.Context, _ *mcp.CallToolRequest, params *SpatialOverlapParams) (*mcp.CallToolResult, any, error) {
	if params == nil {
		return nil, nil, fmt.Errorf("min_lat, max_lat, min_lon, max_lon are required")
	}

	q := url.Values{}
	q.Set("min_lat", fmt.Sprintf("%f", params.MinLat))
	q.Set("max_lat", fmt.Sprintf("%f", params.MaxLat))
	q.Set("min_lon", fmt.Sprintf("%f", params.MinLon))
	q.Set("max_lon", fmt.Sprintf("%f", params.MaxLon))

	return c.getJSON(ctx, "/api/v1/spatial/overlap?"+q.Encode())
}

func (c *Client) getJSON(ctx context.Context, path string) (*mcp.CallToolResult, any, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return nil, nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("backend request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, nil, fmt.Errorf("backend %s: %s", resp.Status, strings.TrimSpace(string(body)))
	}

	var parsed any
	if err := json.Unmarshal(body, &parsed); err != nil {
		return &mcp.CallToolResult{
			Content: []mcp.Content{&mcp.TextContent{Text: string(body)}},
		}, nil, nil
	}

	pretty, err := json.MarshalIndent(parsed, "", "  ")
	if err != nil {
		pretty = body
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(pretty)}},
	}, parsed, nil
}
