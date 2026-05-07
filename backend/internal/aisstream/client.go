package aisstream

import (
	"context"
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

const defaultWSURL = "wss://stream.aisstream.io/v0/stream"

// EU waters bounding box — same coverage as the previous AIS Hub client.
var euBoundingBox = [][][2]float64{{{30, -20}, {72, 45}}}

// ── Wire types ────────────────────────────────────────────────────────────────

type subscriptionMessage struct {
	APIKey             string          `json:"APIKey"`
	BoundingBoxes      [][][2]float64  `json:"BoundingBoxes"`
	FilterMessageTypes []string        `json:"FilterMessageTypes"`
}

// AISMessage is the envelope returned on the channel for every incoming message.
type AISMessage struct {
	MessageType string          `json:"MessageType"`
	Message     json.RawMessage `json:"Message"`
	Metadata    Metadata        `json:"MetaData"`
}

type Metadata struct {
	MMSI      int64   `json:"MMSI"`
	ShipName  string  `json:"ShipName"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Timestamp string  `json:"time_utc"`
}

type PositionReport struct {
	UserID             int64   `json:"UserID"`
	Latitude           float64 `json:"Latitude"`
	Longitude          float64 `json:"Longitude"`
	Sog                float64 `json:"Sog"`
	Cog                float64 `json:"Cog"`
	TrueHeading        int     `json:"TrueHeading"`
	NavigationalStatus int     `json:"NavigationalStatus"`
}

type ShipStaticData struct {
	UserID               int64   `json:"UserID"`
	Name                 string  `json:"Name"`
	CallSign             string  `json:"CallSign"`
	ImoNumber            int64   `json:"ImoNumber"`
	Type                 int     `json:"Type"`
	MaximumStaticDraught float64 `json:"MaximumStaticDraught"`
	Destination          string  `json:"Destination"`
}

// ── Client ────────────────────────────────────────────────────────────────────

type Client struct {
	apiKey string
	wsURL  string
	log    *zap.Logger
}

func NewClient(apiKey string, log *zap.Logger) *Client {
	return &Client{apiKey: apiKey, wsURL: defaultWSURL, log: log}
}

// Stream connects to aisstream.io and emits messages until ctx is cancelled.
// It reconnects automatically with exponential backoff on any disconnection.
// The returned channel is closed when ctx is cancelled.
func (c *Client) Stream(ctx context.Context) <-chan AISMessage {
	ch := make(chan AISMessage, 256)
	go c.runLoop(ctx, ch)
	return ch
}

func (c *Client) runLoop(ctx context.Context, ch chan<- AISMessage) {
	defer close(ch)

	backoff := time.Second
	for {
		if err := c.connect(ctx, ch); err != nil {
			if ctx.Err() != nil {
				return
			}
			c.log.Warn("aisstream disconnected, reconnecting",
				zap.Error(err),
				zap.Duration("backoff", backoff),
			)
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}

		backoff *= 2
		if backoff > 60*time.Second {
			backoff = 60 * time.Second
		}
	}
}

func (c *Client) connect(ctx context.Context, ch chan<- AISMessage) error {
	dialer := websocket.DefaultDialer
	conn, _, err := dialer.DialContext(ctx, c.wsURL, nil)
	if err != nil {
		return err
	}
	defer conn.Close()

	sub, _ := json.Marshal(subscriptionMessage{
		APIKey:             c.apiKey,
		BoundingBoxes:      euBoundingBox,
		FilterMessageTypes: []string{"PositionReport", "ShipStaticData"},
	})
	if err := conn.WriteMessage(websocket.TextMessage, sub); err != nil {
		return err
	}
	c.log.Info("aisstream connected")

	// Reset backoff is handled by the caller; here we just read until error.
	for {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		_, raw, err := conn.ReadMessage()
		if err != nil {
			return err
		}
		var msg AISMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			continue
		}
		select {
		case ch <- msg:
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}
