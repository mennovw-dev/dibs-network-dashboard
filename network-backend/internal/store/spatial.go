package store

import (
	"fmt"

	"dibs-network-backend/internal/models"
	"dibs-network-backend/internal/network"

	"gorm.io/gorm"
)

type SpatialStore struct {
	db *gorm.DB
}

func NewSpatialStore(db *gorm.DB) *SpatialStore {
	return &SpatialStore{db: db}
}

func (s *SpatialStore) ListNodes(status string, withCoordsOnly bool) ([]network.ListingNode, error) {
	if s.hasTable("listings") {
		return s.listNodesFromListings(status, withCoordsOnly)
	}
	return s.listNodesFromLegacyHouses(withCoordsOnly)
}

func (s *SpatialStore) listNodesFromListings(status string, withCoordsOnly bool) ([]network.ListingNode, error) {
	var rows []network.ListingHouseRow
	q := s.baseListingQuery().Where("listings.status = ?", status)
	if withCoordsOnly {
		q = q.Where("houses.map_latitude IS NOT NULL AND houses.map_longitude IS NOT NULL")
	}

	if err := q.Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("list nodes: %w", err)
	}

	nodes := make([]network.ListingNode, 0, len(rows))
	for _, row := range rows {
		nodes = append(nodes, network.ListingNodeFromRow(row))
	}
	return nodes, nil
}

func (s *SpatialStore) listNodesFromLegacyHouses(withCoordsOnly bool) ([]network.ListingNode, error) {
	type legacyHouse struct {
		models.House
		ListedAt *string `gorm:"column:listed_at"`
	}

	q := s.db.Table("houses").Where("listed = ?", true)
	if withCoordsOnly {
		q = q.Where("map_latitude IS NOT NULL AND map_longitude IS NOT NULL")
	}

	var houses []legacyHouse
	if err := q.Find(&houses).Error; err != nil {
		return nil, fmt.Errorf("list legacy house nodes: %w", err)
	}

	nodes := make([]network.ListingNode, 0, len(houses))
	for _, h := range houses {
		nodes = append(nodes, network.ListingNode{
			ID:             h.ID,
			HouseID:        h.ID,
			Name:           h.Name,
			City:           h.City,
			Status:         "active",
			Latitude:       h.MapLatitude,
			Longitude:      h.MapLongitude,
			ReactionsCount: h.ReactionsCount,
			ReactionsMax:   h.ReactionsMax,
			HasCoordinates: h.MapLatitude != nil && h.MapLongitude != nil,
		})
	}
	return nodes, nil
}

func (s *SpatialStore) Overlap(box network.BoundingBox) (network.OverlapResult, error) {
	if !s.hasTable("listings") {
		nodes, err := s.listNodesFromLegacyHouses(true)
		if err != nil {
			return network.OverlapResult{}, err
		}
		filtered := make([]network.ListingNode, 0)
		for _, n := range nodes {
			if network.InBoundingBox(n, box) {
				filtered = append(filtered, n)
			}
		}
		edges, err := s.legacyEdges(filtered)
		if err != nil {
			return network.OverlapResult{}, err
		}
		return network.OverlapResult{Bounds: box, Nodes: filtered, Edges: edges}, nil
	}

	var rows []network.ListingHouseRow
	err := s.baseListingQuery().
		Where("listings.status = ?", "active").
		Where("houses.map_latitude BETWEEN ? AND ?", box.MinLat, box.MaxLat).
		Where("houses.map_longitude BETWEEN ? AND ?", box.MinLon, box.MaxLon).
		Find(&rows).Error
	if err != nil {
		return network.OverlapResult{}, fmt.Errorf("overlap nodes: %w", err)
	}

	nodes := make([]network.ListingNode, 0, len(rows))
	houseIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		nodes = append(nodes, network.ListingNodeFromRow(row))
		houseIDs = append(houseIDs, row.HouseID)
	}

	edges := []network.InteractionEdge{}
	if len(houseIDs) > 0 {
		var reactions []models.Reaction
		if err := s.db.Where("house_id IN ?", houseIDs).Order("created_at DESC").Find(&reactions).Error; err != nil {
			return network.OverlapResult{}, fmt.Errorf("overlap edges: %w", err)
		}
		for _, r := range reactions {
			edges = append(edges, network.InteractionEdgeFromReaction(r))
		}
	}

	return network.OverlapResult{
		Bounds: box,
		Nodes:  nodes,
		Edges:  edges,
	}, nil
}

func (s *SpatialStore) legacyEdges(nodes []network.ListingNode) ([]network.InteractionEdge, error) {
	houseIDs := make([]string, 0, len(nodes))
	for _, n := range nodes {
		houseIDs = append(houseIDs, n.HouseID)
	}
	if len(houseIDs) == 0 {
		return []network.InteractionEdge{}, nil
	}

	edges := []network.InteractionEdge{}
	if s.hasTable("reactions") {
		var reactions []models.Reaction
		if err := s.db.Where("house_id IN ?", houseIDs).Order("created_at DESC").Find(&reactions).Error; err != nil {
			return nil, err
		}
		for _, r := range reactions {
			edges = append(edges, network.InteractionEdgeFromReaction(r))
		}
		return edges, nil
	}

	if s.hasTable("likes") {
		type legacyLike struct {
			ID          string `gorm:"column:id"`
			RenterID    string `gorm:"column:renter_id"`
			HouseID     string `gorm:"column:house_id"`
			RenterLiked bool   `gorm:"column:renter_liked"`
		}
		var likes []legacyLike
		if err := s.db.Table("likes").Where("house_id IN ?", houseIDs).Find(&likes).Error; err != nil {
			return nil, err
		}
		for _, l := range likes {
			edges = append(edges, network.InteractionEdge{
				ID:          l.ID,
				Type:        "like",
				RenterID:    l.RenterID,
				HouseID:     l.HouseID,
				RenterLiked: l.RenterLiked,
			})
		}
	}

	return edges, nil
}

func (s *SpatialStore) hasTable(name string) bool {
	var count int64
	s.db.Raw("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?", name).Scan(&count)
	return count > 0
}

func (s *SpatialStore) baseListingQuery() *gorm.DB {
	return s.db.Table("listings").
		Select(`
			listings.*,
			houses.name AS house_name,
			houses.map_latitude,
			houses.map_longitude,
			houses.reactions_count AS house_reactions_count,
			houses.reactions_max AS house_reactions_max,
			houses.city AS house_city,
			houses.listed AS house_listed
		`).
		Joins("JOIN houses ON houses.id = listings.house_id").
		Where("houses.listed = ?", true)
}
