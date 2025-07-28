package src

import (
	"fmt"
	"net"
	"runtime"
	"sync"
	"time"
)

var (
	// Global system monitoring state
	systemMonitorMutex sync.RWMutex
	processStartTime   = time.Now()
	networkStats       = &NetworkStats{}
	activeConnections  = make(map[string]*StreamConnection)
	connectionsMutex   sync.RWMutex
)

// NetworkStats holds network statistics
type NetworkStats struct {
	BytesReceived   uint64
	BytesSent       uint64
	PacketsReceived uint64
	PacketsSent     uint64
	LastUpdate      time.Time
	LastRxBytes     uint64
	LastTxBytes     uint64
}

// GetSystemStats : Collects comprehensive system statistics
func GetSystemStats() SystemStatsStruct {
	var stats SystemStatsStruct
	
	// CPU Statistics
	stats.CPU.Cores = runtime.NumCPU()
	stats.CPU.Goroutines = runtime.NumGoroutine()
	stats.CPU.Usage = calculateCPUUsage()
	
	// Memory Statistics
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	
	stats.Memory.Allocated = memStats.Alloc
	stats.Memory.Total = getSystemMemory()
	stats.Memory.Used = memStats.Sys
	if stats.Memory.Total > 0 {
		stats.Memory.Usage = float64(stats.Memory.Used) / float64(stats.Memory.Total) * 100
	}
	stats.Memory.GCCycles = memStats.NumGC
	
	// Network Statistics
	updateNetworkStats()
	systemMonitorMutex.RLock()
	stats.Network.BytesReceived = networkStats.BytesReceived
	stats.Network.BytesSent = networkStats.BytesSent
	stats.Network.PacketsReceived = networkStats.PacketsReceived
	stats.Network.PacketsSent = networkStats.PacketsSent
	stats.Network.CurrentBandwidth = calculateCurrentBandwidth()
	systemMonitorMutex.RUnlock()
	
	// Stream Statistics
	stats.Streams = getStreamStats()
	
	// System Information
	stats.System.Uptime = int64(time.Since(processStartTime).Seconds())
	stats.System.StartTime = processStartTime.Unix()
	stats.System.Version = System.Version
	stats.System.GoVersion = runtime.Version()
	stats.System.OS = runtime.GOOS
	stats.System.Architecture = runtime.GOARCH
	
	return stats
}

// calculateCPUUsage : Calculate CPU usage percentage (simplified approach)
func calculateCPUUsage() float64 {
	// This is a simplified CPU usage calculation
	// In a production environment, you might want to use more sophisticated methods
	numGoroutines := runtime.NumGoroutine()
	numCPU := runtime.NumCPU()
	
	// Rough estimation based on goroutine activity
	usage := float64(numGoroutines) / float64(numCPU*10) * 100
	if usage > 100 {
		usage = 100
	}
	
	return usage
}

// getSystemMemory : Get total system memory (cross-platform)
func getSystemMemory() uint64 {
	// This is a simplified approach - in production you'd use platform-specific methods
	var memStats runtime.MemStats
	runtime.ReadMemStats(&memStats)
	
	// Estimate total system memory based on Go's heap usage
	// This is not accurate but provides a reasonable approximation
	return memStats.Sys * 4 // Rough estimation
}

// updateNetworkStats : Update network statistics
func updateNetworkStats() {
	systemMonitorMutex.Lock()
	defer systemMonitorMutex.Unlock()
	
	// Get network interfaces
	interfaces, err := net.Interfaces()
	if err != nil {
		return
	}
	
	var totalRx, totalTx uint64
	
	// Sum up bytes from all interfaces
	for _, iface := range interfaces {
		// Skip loopback and inactive interfaces
		if iface.Flags&net.FlagLoopback != 0 || iface.Flags&net.FlagUp == 0 {
			continue
		}
		
		// In a real implementation, you would read from /proc/net/dev on Linux
		// or use platform-specific APIs. For now, we'll use a simplified approach.
		// This would need to be implemented properly for production use.
	}
	
	networkStats.BytesReceived = totalRx
	networkStats.BytesSent = totalTx
	networkStats.LastUpdate = time.Now()
}

// calculateCurrentBandwidth : Calculate current bandwidth usage
func calculateCurrentBandwidth() float64 {
	if networkStats.LastUpdate.IsZero() {
		return 0
	}
	
	timeDiff := time.Since(networkStats.LastUpdate).Seconds()
	if timeDiff <= 0 {
		return 0
	}
	
	rxDiff := networkStats.BytesReceived - networkStats.LastRxBytes
	txDiff := networkStats.BytesSent - networkStats.LastTxBytes
	totalBytes := rxDiff + txDiff
	
	// Convert to Mbps
	bandwidth := float64(totalBytes*8) / (timeDiff * 1024 * 1024)
	
	networkStats.LastRxBytes = networkStats.BytesReceived
	networkStats.LastTxBytes = networkStats.BytesSent
	
	return bandwidth
}

// getStreamStats : Get streaming statistics
func getStreamStats() struct {
	Active       int                  `json:"active"`
	Total        int                  `json:"total"`
	Connections  []StreamConnection   `json:"connections"`
	Bandwidth    float64              `json:"bandwidth"`
	BufferStatus []BufferStatusInfo   `json:"bufferStatus"`
} {
	var streamStats struct {
		Active       int                  `json:"active"`
		Total        int                  `json:"total"`
		Connections  []StreamConnection   `json:"connections"`
		Bandwidth    float64              `json:"bandwidth"`
		BufferStatus []BufferStatusInfo   `json:"bufferStatus"`
	}
	
	connectionsMutex.RLock()
	defer connectionsMutex.RUnlock()
	
	// Get active connections count
	streamStats.Active = len(activeConnections)
	
	// Get total streams from Data
	streamStats.Total = len(Data.Streams.All)
	
	// Copy active connections
	streamStats.Connections = make([]StreamConnection, 0, len(activeConnections))
	totalBandwidth := 0.0
	
	for _, conn := range activeConnections {
		streamStats.Connections = append(streamStats.Connections, *conn)
		totalBandwidth += conn.Bandwidth
	}
	
	streamStats.Bandwidth = totalBandwidth
	
	// Get buffer status from BufferInformation
	streamStats.BufferStatus = getBufferStatus()
	
	return streamStats
}

// getBufferStatus : Get buffer status information
func getBufferStatus() []BufferStatusInfo {
	var bufferStatus []BufferStatusInfo
	
	// Iterate through BufferInformation to get buffer status
	BufferInformation.Range(func(key, value interface{}) bool {
		if playlist, ok := value.(Playlist); ok {
			for streamID, stream := range playlist.Streams {
				status := BufferStatusInfo{
					StreamID:    fmt.Sprintf("%s_%d", playlist.PlaylistID, streamID),
					ChannelName: stream.ChannelName,
					BufferType:  playlist.Buffer,
					Status:      getBufferStatusString(stream.Status),
					Clients:     len(playlist.Clients),
					Bandwidth:   float64(stream.NetworkBandwidth) / (1024 * 1024) * 8, // Convert to Mbps
					Duration:    stream.Duration,
				}
				
				if stream.Error != "" {
					status.Status = "error"
					status.ErrorMessage = stream.Error
				}
				
				bufferStatus = append(bufferStatus, status)
			}
		}
		return true
	})
	
	return bufferStatus
}

// getBufferStatusString : Convert boolean status to string
func getBufferStatusString(active bool) string {
	if active {
		return "active"
	}
	return "inactive"
}

// RegisterStreamConnection : Register a new streaming connection
func RegisterStreamConnection(id, channelName, url, clientIP, buffer string) {
	connectionsMutex.Lock()
	defer connectionsMutex.Unlock()
	
	connection := &StreamConnection{
		ID:          id,
		ChannelName: channelName,
		URL:         url,
		ClientIP:    clientIP,
		StartTime:   time.Now().Unix(),
		Bandwidth:   0, // Will be updated as data flows
		Buffer:      buffer,
		Status:      "active",
	}
	
	activeConnections[id] = connection
}

// UnregisterStreamConnection : Remove a streaming connection
func UnregisterStreamConnection(id string) {
	connectionsMutex.Lock()
	defer connectionsMutex.Unlock()
	
	delete(activeConnections, id)
}

// UpdateStreamConnectionBandwidth : Update bandwidth for a connection
func UpdateStreamConnectionBandwidth(id string, bandwidth float64) {
	connectionsMutex.Lock()
	defer connectionsMutex.Unlock()
	
	if connection, exists := activeConnections[id]; exists {
		connection.Bandwidth = bandwidth
	}
}

// UpdateStreamConnectionStatus : Update status for a connection
func UpdateStreamConnectionStatus(id, status, errorMsg string) {
	connectionsMutex.Lock()
	defer connectionsMutex.Unlock()
	
	if connection, exists := activeConnections[id]; exists {
		connection.Status = status
		connection.Error = errorMsg
	}
}

// InitSystemMonitoring : Initialize system monitoring
func InitSystemMonitoring() {
	showInfo("System Monitoring: Initializing system monitoring")
	
	// Start network monitoring goroutine
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()
		
		for range ticker.C {
			updateNetworkStats()
		}
	}()
	
	showInfo("System Monitoring: System monitoring initialized")
}