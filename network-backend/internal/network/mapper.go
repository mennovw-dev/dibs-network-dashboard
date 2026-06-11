package network

import (
	"dibs-network-backend/internal/models"
)

// ListingHouseRow is the joined listing + house projection for spatial queries.
type ListingHouseRow struct {
	models.Listing
	HouseName         string   `gorm:"column:house_name"`
	MapLatitude       *float64 `gorm:"column:map_latitude"`
	MapLongitude      *float64 `gorm:"column:map_longitude"`
	HouseReactions    int      `gorm:"column:house_reactions_count"`
	HouseReactionsMax int      `gorm:"column:house_reactions_max"`
	HouseCity         string   `gorm:"column:house_city"`
	HouseListed       bool     `gorm:"column:house_listed"`
}

func ListingNodeFromRow(row ListingHouseRow) ListingNode {
	city := row.City
	if city == "" {
		city = row.HouseCity
	}

	reactionsMax := row.ReactionsMax
	if reactionsMax == 0 {
		reactionsMax = row.HouseReactionsMax
	}

	lat, lon := row.MapLatitude, row.MapLongitude
	hasCoords := lat != nil && lon != nil

	return ListingNode{
		ID:             row.ID,
		HouseID:        row.HouseID,
		Name:           row.HouseName,
		City:           city,
		Status:         row.Status,
		Latitude:       lat,
		Longitude:      lon,
		ReactionsCount: row.HouseReactions,
		ReactionsMax:   reactionsMax,
		ListedAt:       row.ListedAt,
		HasCoordinates: hasCoords,
	}
}

func InteractionEdgeFromReaction(r models.Reaction) InteractionEdge {
	return InteractionEdge{
		ID:          r.ID,
		Type:        "reaction",
		RenterID:    r.RenterID,
		HouseID:     r.HouseID,
		ListingID:   r.ListingID,
		RenterLiked: r.RenterLiked,
		CreatedAt:   r.CreatedAt,
	}
}

func InBoundingBox(node ListingNode, box BoundingBox) bool {
	if !node.HasCoordinates || node.Latitude == nil || node.Longitude == nil {
		return false
	}
	lat, lon := *node.Latitude, *node.Longitude
	return lat >= box.MinLat && lat <= box.MaxLat && lon >= box.MinLon && lon <= box.MaxLon
}
