package models

import "time"

// House mirrors dibs-backend db/models/house.go (read-only subset).
type House struct {
	ID               string   `gorm:"column:id;primaryKey"`
	City             string   `gorm:"column:city"`
	MapLatitude      *float64 `gorm:"column:map_latitude"`
	MapLongitude     *float64 `gorm:"column:map_longitude"`
	Name             string   `gorm:"column:name"`
	ReactionsCount   int      `gorm:"column:reactions_count"`
	ReactionsMax     int      `gorm:"column:reactions_max"`
	Listed           bool     `gorm:"column:listed"`
}

func (House) TableName() string { return "houses" }

// Listing mirrors dibs-backend db/models/listing.go (read-only subset).
type Listing struct {
	ID           string     `gorm:"column:id;primaryKey"`
	HouseID      string     `gorm:"column:house_id"`
	Status       string     `gorm:"column:status"`
	ListedAt     time.Time  `gorm:"column:listed_at"`
	ClosedAt     *time.Time `gorm:"column:closed_at"`
	ReactionsMax int        `gorm:"column:reactions_max"`
	City         string     `gorm:"column:city"`
}

func (Listing) TableName() string { return "listings" }

// Reaction mirrors dibs-backend db/models/reaction.go (read-only subset).
type Reaction struct {
	ID          string    `gorm:"column:id;primaryKey"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	RenterID    string    `gorm:"column:renter_id"`
	HouseID     string    `gorm:"column:house_id"`
	ListingID   *string   `gorm:"column:listing_id"`
	RenterLiked bool      `gorm:"column:renter_liked"`
}

func (Reaction) TableName() string { return "reactions" }
