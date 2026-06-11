package handlers

import (
	"net/http"
	"strconv"

	"dibs-network-backend/internal/network"
	"dibs-network-backend/internal/store"

	"github.com/gin-gonic/gin"
)

type SpatialHandler struct {
	store *store.SpatialStore
}

func NewSpatialHandler(store *store.SpatialStore) *SpatialHandler {
	return &SpatialHandler{store: store}
}

func (h *SpatialHandler) ListNodes(c *gin.Context) {
	status := c.DefaultQuery("status", "active")
	withCoordsOnly := c.Query("with_coordinates") == "true"

	nodes, err := h.store.ListNodes(status, withCoordsOnly)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if nodes == nil {
		nodes = []network.ListingNode{}
	}

	c.JSON(http.StatusOK, gin.H{
		"count": len(nodes),
		"nodes": nodes,
	})
}

func (h *SpatialHandler) Overlap(c *gin.Context) {
	box, ok := parseBoundingBox(c)
	if !ok {
		return
	}

	result, err := h.store.Overlap(box)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if result.Nodes == nil {
		result.Nodes = []network.ListingNode{}
	}
	if result.Edges == nil {
		result.Edges = []network.InteractionEdge{}
	}

	c.JSON(http.StatusOK, result)
}

func parseBoundingBox(c *gin.Context) (network.BoundingBox, bool) {
	minLat, err1 := strconv.ParseFloat(c.Query("min_lat"), 64)
	maxLat, err2 := strconv.ParseFloat(c.Query("max_lat"), 64)
	minLon, err3 := strconv.ParseFloat(c.Query("min_lon"), 64)
	maxLon, err4 := strconv.ParseFloat(c.Query("max_lon"), 64)
	if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "min_lat, max_lat, min_lon, max_lon query params are required floats",
		})
		return network.BoundingBox{}, false
	}
	if minLat > maxLat || minLon > maxLon {
		c.JSON(http.StatusBadRequest, gin.H{"error": "min values must be less than or equal to max values"})
		return network.BoundingBox{}, false
	}

	return network.BoundingBox{
		MinLat: minLat,
		MaxLat: maxLat,
		MinLon: minLon,
		MaxLon: maxLon,
	}, true
}
