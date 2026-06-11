package network

import "time"

// ListingNode is a map-ready view of an active listing + house location.
type ListingNode struct {
	ID             string     `json:"id"`
	HouseID        string     `json:"house_id"`
	Name           string     `json:"name"`
	City           string     `json:"city"`
	Status         string     `json:"status"`
	Latitude       *float64   `json:"latitude,omitempty"`
	Longitude      *float64   `json:"longitude,omitempty"`
	ReactionsCount int        `json:"reactions_count"`
	ReactionsMax   int        `json:"reactions_max"`
	ListedAt       time.Time  `json:"listed_at"`
	HasCoordinates bool       `json:"has_coordinates"`
}

// InteractionEdge is a renter↔listing/house interaction (reaction).
type InteractionEdge struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	RenterID    string    `json:"renter_id"`
	HouseID     string    `json:"house_id"`
	ListingID   *string   `json:"listing_id,omitempty"`
	RenterLiked bool      `json:"renter_liked"`
	CreatedAt   time.Time `json:"created_at"`
}

// OverlapResult groups nodes in a bounding box with their edges.
type OverlapResult struct {
	Bounds BoundingBox       `json:"bounds"`
	Nodes  []ListingNode     `json:"nodes"`
	Edges  []InteractionEdge `json:"edges"`
}

// BoundingBox defines a geographic query window.
type BoundingBox struct {
	MinLat float64 `json:"min_lat"`
	MaxLat float64 `json:"max_lat"`
	MinLon float64 `json:"min_lon"`
	MaxLon float64 `json:"max_lon"`
}
