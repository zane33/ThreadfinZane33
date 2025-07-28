package src

// RequestStruct : Anfragen über die Websocket Schnittstelle
type RequestStruct struct {
	// Befehle an Threadfin
	Cmd string `json:"cmd,required"`

	// Benutzer
	DeleteUser bool                   `json:"deleteUser,omitempty"`
	UserData   map[string]interface{} `json:"userData,omitempty"`

	// Mapping
	EpgMapping map[string]interface{} `json:"epgMapping,omitempty"`

	// Restore
	Base64 string `json:"base64,omitempty"`

	// Neue Werte für die Einstellungen (settings.json)
	Settings struct {
		API                      *bool     `json:"api,omitempty"`
		SSDP                     *bool     `json:"ssdp,omitempty"`
		AuthenticationAPI        *bool     `json:"authentication.api,omitempty"`
		AuthenticationM3U        *bool     `json:"authentication.m3u,omitempty"`
		AuthenticationPMS        *bool     `json:"authentication.pms,omitempty"`
		AuthenticationWEP        *bool     `json:"authentication.web,omitempty"`
		AuthenticationXML        *bool     `json:"authentication.xml,omitempty"`
		BackupKeep               *int      `json:"backup.keep,omitempty"`
		BackupPath               *string   `json:"backup.path,omitempty"`
		Buffer                   *string   `json:"buffer,omitempty"`
		BufferSize               *int      `json:"buffer.size.kb,omitempty"`
		BufferTimeout            *float64  `json:"buffer.timeout,omitempty"`
		CacheImages              *bool     `json:"cache.images,omitempty"`
		EpgSource                *string   `json:"epgSource,omitempty"`
		FFmpegOptions            *string   `json:"ffmpeg.options,omitempty"`
		FFmpegPath               *string   `json:"ffmpeg.path,omitempty"`
		FfmpegForceHttp          *bool     `json:"ffmpeg.forceHttp,omitempty"`
		VLCOptions               *string   `json:"vlc.options,omitempty"`
		VLCPath                  *string   `json:"vlc.path,omitempty"`
		FilesUpdate              *bool     `json:"files.update,omitempty"`
		TempPath                 *string   `json:"temp.path,omitempty"`
		Tuner                    *int      `json:"tuner,omitempty"`
		UDPxy                    *string   `json:"udpxy,omitempty"`
		Update                   *[]string `json:"update,omitempty"`
		UserAgent                *string   `json:"user.agent,omitempty"`
		XepgReplaceMissingImages *bool     `json:"xepg.replace.missing.images,omitempty"`
		XepgReplaceChannelTitle  *bool     `json:"xepg.replace.channel.title,omitempty"`
		ThreadfinAutoUpdate      *bool     `json:"ThreadfinAutoUpdate,omitempty"`
		SchemeM3U                *string   `json:"scheme.m3u,omitempty"`
		SchemeXML                *string   `json:"scheme.xml,omitempty"`
		StoreBufferInRAM         *bool     `json:"storeBufferInRAM,omitempty"`
		ForceHttps               *bool     `json:"forceHttps,omitempty"`
		HttpsPort                *int      `json:"httpsPort,omitempty"`
		HttpsThreadfinDomain     *string   `json:"httpsThreadfinDomain,omitempty"`
		HttpThreadfinDomain      *string   `json:"httpThreadfinDomain,omitempty"`
		BindIpAddress            *string   `json:"bindIpAddress,omitempty"`
		EnableNonAscii           *bool     `json:"enableNonAscii,omitempty"`
		EpgCategories            *string   `json:"epgCategories,omitempty"`
		EpgCategoriesColors      *string   `json:"epgCategoriesColors,omitempty"`
		Dummy                    *bool     `json:"dummy,omitempty"`
		DummyChannel             *string   `json:"dummyChannel,omitempty"`
		IgnoreFilters            *bool     `json:"ignoreFilters,omitempty"`
		OneRequestPerTuner       *bool     `json:"oneRequestPerTuner,omitempty"`
	} `json:"settings,omitempty"`

	// Upload Logo
	Filename string `json:"filename,omitempty"`

	// Filter
	Filter map[int64]interface{} `json:"filter,omitempty"`

	// Dateien (M3U, HDHR, XMLTV)
	Files struct {
		HDHR  map[string]interface{} `json:"hdhr,omitempty"`
		M3U   map[string]interface{} `json:"m3u,omitempty"`
		XMLTV map[string]interface{} `json:"xmltv,omitempty"`
	} `json:"files,omitempty"`

	// Wizard
	Wizard struct {
		EpgSource *string `json:"epgSource,omitempty"`
		M3U       *string `json:"m3u,omitempty"`
		Tuner     *int    `json:"tuner,omitempty"`
		XMLTV     *string `json:"xmltv,omitempty"`
	} `json:"wizard,omitempty"`

	// Probe Url
	ProbeURL string `json:"probeURL,omitempty"`
}

// ResponseStruct : Antworten an den Client (WEB)
type ResponseStruct struct {
	ClientInfo struct {
		ARCH           string `json:"arch"`
		Branch         string `json:"branch,omitempty"`
		DVR            string `json:"DVR"`
		EpgSource      string `json:"epgSource"`
		Errors         int    `json:"errors"`
		M3U            string `json:"m3u-url,required"`
		OS             string `json:"os"`
		Streams        string `json:"streams"`
		ActiveClients  int    `json:"activeClients"`
		TotalClients   int    `json:"totalClients"`
		ActivePlaylist int    `json:"activePlaylist"`
		TotalPlaylist  int    `json:"totalPlaylist"`
		UUID           string `json:"uuid"`
		Version        string `json:"version"`
		Warnings       int    `json:"warnings"`
		XEPGCount      int64  `json:"xepg"`
		XML            string `json:"xepg-url,required"`
	} `json:"clientInfo,omitempty"`

	Data struct {
		Playlist struct {
			M3U struct {
				Groups struct {
					Text  []string `json:"text,required"`
					Value []string `json:"value,required"`
				} `json:"groups,required"`
			} `json:"m3u,required"`
		} `json:"playlist,required"`

		StreamPreviewUI struct {
			Active   []string `json:"activeStreams,required"`
			Inactive []string `json:"inactiveStreams,required"`
		}
	} `json:"data,required"`

	Alert               string                 `json:"alert,omitempty"`
	ConfigurationWizard bool                   `json:"configurationWizard,required"`
	Error               string                 `json:"err,omitempty"`
	Log                 WebScreenLogStruct     `json:"log,required"`
	LogoURL             string                 `json:"logoURL,omitempty"`
	OpenLink            string                 `json:"openLink,omitempty"`
	OpenMenu            string                 `json:"openMenu,omitempty"`
	Reload              bool                   `json:"reload,omitempty"`
	Settings            SettingsStruct         `json:"settings,required"`
	Status              bool                   `json:"status,required"`
	Token               string                 `json:"token,omitempty"`
	Users               map[string]interface{} `json:"users,omitempty"`
	Wizard              int                    `json:"wizard,omitempty"`
	XEPG                map[string]interface{} `json:"xepg,required"`
	ProbeInfo           ProbeInfoStruct        `json:"probeInfo,omitempty"`
	SystemStats         SystemStatsStruct      `json:"systemStats,omitempty"`

	Notification map[string]Notification `json:"notification,omitempty"`
}

type ProbeInfoStruct struct {
	Resolution   string `json:"resolution,omitempty"`
	FrameRate    string `json:"frameRate,omitempty"`
	AudioChannel string `json:"audioChannel,omitempty"`
}

// SystemStatsStruct : System monitoring information
type SystemStatsStruct struct {
	CPU struct {
		Usage     float64 `json:"usage"`     // CPU usage percentage (0-100)
		Cores     int     `json:"cores"`     // Number of CPU cores
		Goroutines int    `json:"goroutines"` // Number of active goroutines
	} `json:"cpu"`
	
	Memory struct {
		Used      uint64  `json:"used"`      // Memory used in bytes
		Total     uint64  `json:"total"`     // Total system memory in bytes
		Usage     float64 `json:"usage"`     // Memory usage percentage (0-100)
		Allocated uint64  `json:"allocated"` // Memory allocated by Go runtime in bytes
		GCCycles  uint32  `json:"gcCycles"`  // Number of garbage collection cycles
	} `json:"memory"`
	
	Network struct {
		BytesReceived    uint64  `json:"bytesReceived"`    // Total bytes received
		BytesSent        uint64  `json:"bytesSent"`        // Total bytes sent
		PacketsReceived  uint64  `json:"packetsReceived"`  // Total packets received
		PacketsSent      uint64  `json:"packetsSent"`      // Total packets sent
		CurrentBandwidth float64 `json:"currentBandwidth"` // Current bandwidth usage in Mbps
	} `json:"network"`
	
	Streams struct {
		Active       int                  `json:"active"`       // Number of active streaming connections
		Total        int                  `json:"total"`        // Total number of streams
		Connections  []StreamConnection   `json:"connections"`  // Active stream connections
		Bandwidth    float64              `json:"bandwidth"`    // Total streaming bandwidth in Mbps
		BufferStatus []BufferStatusInfo   `json:"bufferStatus"` // Buffer status for active streams
	} `json:"streams"`
	
	System struct {
		Uptime        int64  `json:"uptime"`        // System uptime in seconds
		StartTime     int64  `json:"startTime"`     // Process start time (Unix timestamp)
		Version       string `json:"version"`       // Threadfin version
		GoVersion     string `json:"goVersion"`     // Go runtime version
		OS            string `json:"os"`            // Operating system
		Architecture  string `json:"architecture"`  // System architecture
	} `json:"system"`
}

// StreamConnection : Information about active streaming connection
type StreamConnection struct {
	ID           string  `json:"id"`           // Unique connection ID
	ChannelName  string  `json:"channelName"`  // Channel being streamed
	URL          string  `json:"url"`          // Stream URL
	ClientIP     string  `json:"clientIP"`     // Client IP address
	StartTime    int64   `json:"startTime"`    // Connection start time (Unix timestamp)
	Bandwidth    float64 `json:"bandwidth"`    // Connection bandwidth in Mbps
	Buffer       string  `json:"buffer"`       // Buffer type (ffmpeg, vlc, threadfin, -)
	Status       string  `json:"status"`       // Connection status (active, buffering, error)
	Error        string  `json:"error,omitempty"` // Error message if any
}

// BufferStatusInfo : Buffer status information
type BufferStatusInfo struct {
	StreamID     string  `json:"streamId"`     // Stream identifier
	ChannelName  string  `json:"channelName"`  // Channel name
	BufferType   string  `json:"bufferType"`   // Buffer type (ffmpeg, vlc, threadfin)
	Status       string  `json:"status"`       // Buffer status (active, inactive, error)
	Clients      int     `json:"clients"`      // Number of connected clients
	Bandwidth    float64 `json:"bandwidth"`    // Buffer bandwidth usage in Mbps
	Duration     float64 `json:"duration"`     // Buffer duration in seconds
	ErrorMessage string  `json:"errorMessage,omitempty"` // Error message if any
}

// APIRequestStruct : Anfrage über die API Schnittstelle
type APIRequestStruct struct {
	Cmd      string `json:"cmd"`
	Password string `json:"password"`
	Token    string `json:"token"`
	Username string `json:"username"`
}

// APIResponseStruct : Antwort an den Client (API)
type APIResponseStruct struct {
	EpgSource        string `json:"epg.source,omitempty"`
	Error            string `json:"err,omitempty"`
	Status           bool   `json:"status,required"`
	StreamsActive    int64  `json:"streams.active,omitempty"`
	StreamsAll       int64  `json:"streams.all,omitempty"`
	StreamsXepg      int64  `json:"streams.xepg,omitempty"`
	Token            string `json:"token,omitempty"`
	URLDvr           string `json:"url.dvr,omitempty"`
	URLM3U           string `json:"url.m3u,omitempty"`
	URLXepg          string `json:"url.xepg,omitempty"`
	VersionAPI       string `json:"version.api,omitempty"`
	VersionThreadfin string `json:"version.threadfin,omitempty"`
}

// WebScreenLogStruct : Logs werden im RAM gespeichert und für das Webinterface bereitgestellt
type WebScreenLogStruct struct {
	Errors   int      `json:"errors,required"`
	Log      []string `json:"log,required"`
	Warnings int      `json:"warnings,required"`
}
