package src

import (
	"fmt"
	"os"
	"runtime"
	"strings"
	"sync"

	"github.com/avfs/avfs"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

// System : Beinhaltet alle Systeminformationen
var System SystemStruct

// WebScreenLog : Logs werden im RAM gespeichert und für das Webinterface bereitgestellt
var WebScreenLog WebScreenLogStruct

// Settings : Inhalt der settings.json
var Settings SettingsStruct

// Data : Alle Daten werden hier abgelegt. (Lineup, XMLTV)
var Data DataStruct

// SystemFiles : Alle Systemdateien
var SystemFiles = []string{"authentication.json", "pms.json", "settings.json", "xepg.json", "urls.json"}

// BufferInformation : Informationen über den Buffer (aktive Streams, maximale Streams)
var BufferInformation sync.Map

// bufferVFS : Filesystem to use for the Buffer
var bufferVFS avfs.VFS

// BufferClients : Anzahl der Clients die einen Stream über den Buffer abspielen
var BufferClients sync.Map

// Lock : Lock Map
var Lock = sync.RWMutex{}

var (
	xepgMutex   sync.Mutex
	infoMutex   sync.Mutex
	logMutex    sync.Mutex
	systemMutex sync.Mutex
)

// Init : Systeminitialisierung
func Init() (err error) {

	var debug string

	// System Einstellungen
	System.AppName = strings.ToLower(System.Name)
	System.ARCH = runtime.GOARCH
	System.OS = runtime.GOOS

	// Initialize server protocols with default values
	System.ServerProtocol = ServerProtocolStruct{
		API: "http",
		DVR: "http",
		M3U: "http",
		WEB: "http",
		XML: "http",
	}

	System.PlexChannelLimit = 480
	System.UnfilteredChannelLimit = 480
	System.Compatibility = "0.1.0"

	// FFmpeg Default Einstellungen
	System.FFmpeg.DefaultOptions = "-hide_banner -loglevel error -analyzeduration 1000000 -probesize 1000000 -protocol_whitelist file,http,https,tcp,tls,crypto -timeout 30000000 -i [URL] -map 0:v -map 0:a:0 -c:v copy -c:a aac -b:a 192k -ac 2 -c:s copy -f mpegts -fflags +genpts -movflags +faststart -copyts pipe:1"
	System.VLC.DefaultOptions = "-I dummy [URL] --sout #std{mux=ts,access=file,dst=-}"

	// Default Logeinträge, wird später von denen aus der settings.json überschrieben
	Settings.LogEntriesRAM = 500

	// Variablen für den Update Prozess
	System.Update.Git = fmt.Sprintf("https://github.com/%s/%s", System.GitHub.User, System.GitHub.Repo)
	System.Update.Github = fmt.Sprintf("https://api.github.com/repos/%s/%s", System.GitHub.User, System.GitHub.Repo)
	System.Update.Name = "Threadfin"

	// Ordnerpfade festlegen
	var tempFolder = os.TempDir() + string(os.PathSeparator) + System.AppName + string(os.PathSeparator)
	tempFolder = getPlatformPath(strings.Replace(tempFolder, "//", "/", -1))

	if len(System.Folder.Config) == 0 {
		System.Folder.Config = GetUserHomeDirectory() + string(os.PathSeparator) + "." + System.AppName + string(os.PathSeparator)
	} else {
		System.Folder.Config = strings.TrimRight(System.Folder.Config, string(os.PathSeparator)) + string(os.PathSeparator)
	}

	System.Folder.Config = getPlatformPath(System.Folder.Config)

	System.Folder.Backup = System.Folder.Config + "backup" + string(os.PathSeparator)
	System.Folder.Data = System.Folder.Config + "data" + string(os.PathSeparator)
	System.Folder.Cache = System.Folder.Config + "cache" + string(os.PathSeparator)
	System.Folder.ImagesCache = System.Folder.Cache + "images" + string(os.PathSeparator)
	System.Folder.ImagesUpload = System.Folder.Data + "images" + string(os.PathSeparator)
	System.Folder.Temp = tempFolder

	// Dev Info
	showDevInfo()

	// System Ordner erstellen
	err = createSystemFolders()
	if err != nil {
		ShowError(err, 1070)
		return
	}

	if len(System.Flag.Restore) > 0 {
		// Einstellungen werden über CLI wiederhergestellt. Weitere Initialisierung ist nicht notwendig.
		return
	}

	System.File.XML = getPlatformFile(fmt.Sprintf("%s%s.xml", System.Folder.Data, System.AppName))
	System.File.M3U = getPlatformFile(fmt.Sprintf("%s%s.m3u", System.Folder.Data, System.AppName))

	System.Compressed.GZxml = getPlatformFile(fmt.Sprintf("%s%s.xml.gz", System.Folder.Data, System.AppName))

	err = activatedSystemAuthentication()
	if err != nil {
		return
	}

	err = resolveHostIP()
	if err != nil {
		ShowError(err, 1002)
	}

	// Menü für das Webinterface
	System.WEB.Menu = []string{"playlist", "xmltv", "filter", "mapping", "users", "settings", "log", "logout"}

	fmt.Println("For help run: " + getPlatformFile(os.Args[0]) + " -h")
	fmt.Println()

	// Überprüfen ob Threadfin als root läuft
	if os.Geteuid() == 0 {
		showWarning(2110)
	}

	if System.Flag.Debug > 0 {
		debug = fmt.Sprintf("Debug Level:%d", System.Flag.Debug)
		showDebug(debug, 1)
	}

	showInfo(fmt.Sprintf("Version:%s Build: %s", System.Version, System.Build))
	showInfo(fmt.Sprintf("Database Version:%s", System.DBVersion))
	showInfo(fmt.Sprintf("System IP Addresses:IPv4: %d | IPv6: %d", len(System.IPAddressesV4), len(System.IPAddressesV6)))
	showInfo("Hostname:" + System.Hostname)
	showInfo(fmt.Sprintf("System Folder:%s", getPlatformPath(System.Folder.Config)))

	// Systemdateien erstellen (Falls nicht vorhanden)
	err = createSystemFiles()
	if err != nil {
		ShowError(err, 1071)
		return
	}

	err = conditionalUpdateChanges()
	if err != nil {
		return
	}

	// Einstellungen laden (settings.json)
	showInfo(fmt.Sprintf("Load Settings:%s", System.File.Settings))

	Settings, err = loadSettings()
	if err != nil {
		ShowError(err, 0)
		return
	}

	// Set initial domain based on settings or environment variable
	var domain string
	if envDomain := os.Getenv("THREADFIN_DOMAIN"); envDomain != "" {
		domain = envDomain
		showInfo(fmt.Sprintf("Using domain from environment variable: %s", domain))
	} else if Settings.HttpThreadfinDomain != "" {
		domain = getBaseUrl(Settings.HttpThreadfinDomain, Settings.Port)
	} else {
		// Default to localhost if no domain is set
		domain = fmt.Sprintf("localhost:%s", Settings.Port)
	}
	setGlobalDomain(domain)

	showInfo(fmt.Sprintf("Initial domain set to: %s", System.Domain))
	showInfo(fmt.Sprintf("XML URL: %s", System.Addresses.XML))

	// Berechtigung aller Ordner überprüfen
	err = checkFilePermission(System.Folder.Config)
	if err == nil {
		err = checkFilePermission(System.Folder.Temp)
	}

	// Separaten tmp Ordner für jede Instanz
	System.Folder.Temp = System.Folder.Temp + Settings.UUID + string(os.PathSeparator)
	showInfo(fmt.Sprintf("Temporary Folder:%s", getPlatformPath(System.Folder.Temp)))

	err = checkFolder(System.Folder.Temp)
	if err != nil {
		return
	}

	err = removeChildItems(getPlatformPath(System.Folder.Temp))
	if err != nil {
		return
	}

	// Branch festlegen
	System.Branch = cases.Title(language.English).String(Settings.Branch)

	if System.Dev {
		System.Branch = cases.Title(language.English).String("development")
	}

	if len(System.Branch) == 0 {
		System.Branch = cases.Title(language.English).String("main")
	}

	showInfo(fmt.Sprintf("GitHub:https://github.com/%s", System.GitHub.User))
	showInfo(fmt.Sprintf("Git Branch:%s [%s]", System.Branch, System.GitHub.User))

	// Update domain with final settings
	if envDomain := os.Getenv("THREADFIN_DOMAIN"); envDomain != "" {
		setGlobalDomain(envDomain)
		showInfo(fmt.Sprintf("Final domain set from environment variable: %s", envDomain))
	} else if Settings.HttpThreadfinDomain != "" {
		setGlobalDomain(getBaseUrl(Settings.HttpThreadfinDomain, Settings.Port))
	} else {
		setGlobalDomain(fmt.Sprintf("%s:%s", System.IPAddress, Settings.Port))
	}

	System.URLBase = fmt.Sprintf("%s://%s:%s", System.ServerProtocol.WEB, System.IPAddress, Settings.Port)

	// HTML Dateien erstellen, mit dev == true werden die lokalen HTML Dateien verwendet
	if System.Dev == true {

		HTMLInit("webUI", "src", "html"+string(os.PathSeparator), "src"+string(os.PathSeparator)+"webUI.go")
		err = BuildGoFile()
		if err != nil {
			return
		}

	}

	// DLNA Server starten
	if Settings.SSDP {
		err = SSDP()
		if err != nil {
			return
		}
		// Start UDP discovery for HDHomeRun compatibility
		startUDPDiscovery()
	}

	// HTML Datein laden
	loadHTMLMap()

	return
}

// StartSystem : System wird gestartet
func StartSystem(updateProviderFiles bool) (err error) {

	setDeviceID()

	if System.ScanInProgress == 1 {
		return
	}

	// Systeminformationen in der Konsole ausgeben
	showInfo(fmt.Sprintf("UUID:%s", Settings.UUID))
	showInfo(fmt.Sprintf("Tuner (Plex / Emby):%d", Settings.Tuner))
	showInfo(fmt.Sprintf("EPG Source:%s", Settings.EpgSource))
	showInfo(fmt.Sprintf("Plex Channel Limit:%d", System.PlexChannelLimit))
	showInfo(fmt.Sprintf("Unfiltered Chan. Limit:%d", System.UnfilteredChannelLimit))

	// Check for environment variable to override FilesUpdate setting for faster startup
	var filesUpdateOverride = os.Getenv("THREADFIN_FAST_STARTUP")
	var shouldUpdateFiles = Settings.FilesUpdate
	if filesUpdateOverride == "true" || filesUpdateOverride == "1" {
		shouldUpdateFiles = false
		showInfo("Fast Startup: Skipping provider file updates due to THREADFIN_FAST_STARTUP environment variable")
	}

	// Providerdaten aktualisieren
	if len(Settings.Files.M3U) > 0 && shouldUpdateFiles == true || updateProviderFiles == true {

		err = ThreadfinAutoBackup()
		if err != nil {
			ShowError(err, 1090)
		}

		getProviderData("m3u", "")
		getProviderData("hdhr", "")

		if Settings.EpgSource == "XEPG" {
			getProviderData("xmltv", "")
		}

	}

	err = buildDatabaseDVR()
	if err != nil {
		ShowError(err, 0)
		return
	}

	buildXEPG(true)

	return
}
