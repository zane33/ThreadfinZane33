package src

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	m3u "threadfin/src/internal/m3u-parser"
)

// fileType: Welcher Dateityp soll aktualisiert werden (m3u, hdhr, xml) | fileID: Update einer bestimmten Datei (Provider ID)
func getProviderData(fileType, fileID string) (err error) {

	showInfo("Provider:" + "getProviderData called with fileType=" + fileType + " fileID=" + fileID)

	var fileExtension, serverFileName string
	var body = make([]byte, 0)
	var newProvider = false
	var dataMap = make(map[string]interface{})

	var saveDateFromProvider = func(fileSource, serverFileName, id string, body []byte) (err error) {

		var data = make(map[string]interface{})

		if value, ok := dataMap[id].(map[string]interface{}); ok {
			data = value
		} else {
			data["id.provider"] = id
			dataMap[id] = data
		}

		// Default keys für die Providerdaten
		var keys = []string{"name", "description", "type", "file." + System.AppName, "file.source", "tuner", "http_proxy.ip", "http_proxy.port", "last.update", "compatibility", "counter.error", "counter.download", "provider.availability"}

		for _, key := range keys {

			if _, ok := data[key]; !ok {

				switch key {

				case "name":
					data[key] = serverFileName

				case "description":
					data[key] = ""

				case "type":
					data[key] = fileType

				case "file." + System.AppName:
					data[key] = id + fileExtension

				case "file.source":
					data[key] = fileSource

				case "http_proxy.ip":
					data[key] = ""

				case "http_proxy.port":
					data[key] = ""

				case "last.update":
					data[key] = time.Now().Format("2006-01-02 15:04:05")

				case "tuner":
					if fileType == "m3u" || fileType == "hdhr" {
						if _, ok := data[key].(float64); !ok {
							data[key] = 1
						}
					}

				case "compatibility":
					data[key] = make(map[string]interface{})

				case "counter.download":
					data[key] = 0.0

				case "counter.error":
					data[key] = 0.0

				case "provider.availability":
					data[key] = 100
				}

			}

		}

		if _, ok := data["id.provider"]; !ok {
			data["id.provider"] = id
		}

		// Datei extrahieren
		body, err = extractGZIP(body, fileSource)
		if err != nil {
			ShowError(err, 000)
			return
		}

		// Daten überprüfen
		showInfo("Check File:" + fileSource)

		switch fileType {

		case "m3u":
			newM3u, err := m3u.MakeInterfaceFromM3U(body)
			if err != nil {
				return err
			}

			var m3uContent strings.Builder
			m3uContent.WriteString("#EXTM3U\n")

			for _, channel := range newM3u {
				channelMap := channel.(map[string]string)

				extinf := fmt.Sprintf(`#EXTINF:-1 tvg-id="%s" tvg-name="%s" tvg-chno="%s" tvg-logo="%s" group-title="%s",%s`,
					channelMap["tvg-id"],
					channelMap["tvg-name"],
					channelMap["tvg-chno"],
					channelMap["tvg-logo"],
					channelMap["group-title"],
					channelMap["name"],
				)

				m3uContent.WriteString(extinf + "\n" + channelMap["url"] + "\n")
			}

			m3uBytes := []byte(m3uContent.String())
			body = m3uBytes

		case "hdhr":
			_, err = jsonToInterface(string(body))

		case "xmltv":
			err = checkXMLCompatibility(id, body)

		}

		if err != nil {
			return
		}

		var filePath = System.Folder.Data + data["file."+System.AppName].(string)

		err = writeByteToFile(filePath, body)

		if err == nil {
			data["last.update"] = time.Now().Format("2006-01-02 15:04:05")
			data["counter.download"] = data["counter.download"].(float64) + 1
		}

		return

	}

	switch fileType {

	case "m3u":
		dataMap = Settings.Files.M3U
		fileExtension = ".m3u"

	case "hdhr":
		dataMap = Settings.Files.HDHR
		fileExtension = ".json"

	case "xmltv":
		dataMap = Settings.Files.XMLTV
		fileExtension = ".xml"

	}

	for dataID, d := range dataMap {

		var data = d.(map[string]interface{})
		var fileSource = data["file.source"].(string)
		var httpProxyIp = ""
		if data["http_proxy.ip"] != nil {
			httpProxyIp = data["http_proxy.ip"].(string)
		}
		var httpProxyPort = ""
		if data["http_proxy.port"] != nil {
			httpProxyPort = data["http_proxy.port"].(string)
		}
		var httpProxyUrl = ""
		if httpProxyIp != "" && httpProxyPort != "" {
			httpProxyUrl = fmt.Sprintf("http://%s:%s", httpProxyIp, httpProxyPort)
		}

		newProvider = false

		if _, ok := data["new"]; ok {
			newProvider = true
			delete(data, "new")
		}

		// Wenn eine ID vorhanden ist und nicht mit der aus der Datanbank übereinstimmt, wird die Aktualisierung übersprungen (goto)
		if len(fileID) > 0 && newProvider == false {
			if dataID != fileID {
				goto Done
			}
		}

		switch fileType {

		case "hdhr":

			// Laden vom HDHomeRun Tuner
			showInfo("Tuner:" + fileSource)
			var tunerURL = "http://" + fileSource + "/lineup.json"
			serverFileName, body, err = downloadFileFromServer(tunerURL, httpProxyUrl)

		default:

			if strings.Contains(fileSource, "http://") || strings.Contains(fileSource, "https://") {

				// Laden vom Remote Server
				showInfo("Download:" + "Processing file " + fileSource)
				showInfo("Download:" + "Using proxy " + httpProxyUrl)
							showInfo("Download:" + "Calling downloadFileFromServer function")
			serverFileName, body, err = downloadFileFromServer(fileSource, httpProxyUrl)
			showInfo("Download:" + "downloadFileFromServer function completed")

			} else {

				// Laden einer lokalen Datei
				showInfo("Open:" + fileSource)

				err = checkFile(fileSource)
				if err == nil {
					body, err = readByteFromFile(fileSource)
					serverFileName = getFilenameFromPath(fileSource)
				}

			}

		}

		if err == nil {

			showInfo("Save Process:Starting save process for " + fileSource)
			err = saveDateFromProvider(fileSource, serverFileName, dataID, body)
			if err == nil {
				showInfo("Save File:" + fileSource + " [ID: " + dataID + "]")
			} else {
				showInfo("Save Error:Failed to save file - " + err.Error())
			}

		} else {
			showInfo("Download:" + "Failed, will not proceed to save - " + err.Error())
		}

		if err != nil {

			ShowError(err, 000)
			
			// Create more specific error messages for different failure types
			var userFriendlyErr error
			if strings.Contains(err.Error(), "timeout") || strings.Contains(err.Error(), "Client.Timeout") {
				userFriendlyErr = fmt.Errorf("Failed to download from %s: Request timed out after 30 seconds. Please check if the URL is accessible and try again", fileSource)
			} else if strings.Contains(err.Error(), "no such host") || strings.Contains(err.Error(), "lookup") {
				userFriendlyErr = fmt.Errorf("Failed to download from %s: Cannot resolve hostname. Please check the URL and your network connection", fileSource)
			} else if strings.Contains(err.Error(), "connection refused") {
				userFriendlyErr = fmt.Errorf("Failed to download from %s: Connection refused. The server may be down or the port blocked", fileSource)
			} else if strings.Contains(err.Error(), "404") {
				userFriendlyErr = fmt.Errorf("Failed to download from %s: File not found (404). Please verify the URL is correct", fileSource)
			} else if strings.Contains(err.Error(), "403") {
				userFriendlyErr = fmt.Errorf("Failed to download from %s: Access denied (403). You may need authentication or the file is restricted", fileSource)
			} else if strings.Contains(err.Error(), "500") {
				userFriendlyErr = fmt.Errorf("Failed to download from %s: Server error (500). The remote server is experiencing issues", fileSource)
			} else {
				userFriendlyErr = fmt.Errorf("Failed to download from %s: %s", fileSource, err.Error())
			}

			if newProvider == false {

				// Prüfen ob ältere Datei vorhanden ist
				var file = System.Folder.Data + dataID + fileExtension

				err = checkFile(file)
				if err == nil {

					if len(fileID) == 0 {
						showWarning(1011)
					}

					err = userFriendlyErr
				}

				// Fehler Counter um 1 erhöhen
				var data = make(map[string]interface{})
				if value, ok := dataMap[dataID].(map[string]interface{}); ok {

					data = value
					data["counter.error"] = data["counter.error"].(float64) + 1
					data["counter.download"] = data["counter.download"].(float64) + 1

				}

			} else {
				return userFriendlyErr
			}

		}

		// Berechnen der Fehlerquote
		if newProvider == false {

			if value, ok := dataMap[dataID].(map[string]interface{}); ok {

				var data = make(map[string]interface{})
				data = value

				if data["counter.error"].(float64) == 0 {
					data["provider.availability"] = 100
				} else {
					data["provider.availability"] = int(data["counter.error"].(float64)*100/data["counter.download"].(float64)*-1 + 100)
				}

			}

		}

		switch fileType {

		case "m3u":
			Settings.Files.M3U = dataMap

		case "hdhr":
			Settings.Files.HDHR = dataMap

		case "xmltv":
			Settings.Files.XMLTV = dataMap
			delete(Data.Cache.XMLTV, System.Folder.Data+dataID+fileExtension)

		}

		saveSettings(Settings)

	Done:
	}

	return
}

func downloadFileFromServer(providerURL string, proxyUrl string) (filename string, body []byte, err error) {
	showInfo("Download:" + "Start downloading from " + providerURL)
	
	_, err = url.ParseRequestURI(providerURL)
	if err != nil {
		showInfo("Download:" + "Invalid URL format - " + providerURL)
		return
	}

	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	if proxyUrl != "" {
		showInfo("Download:" + "Using proxy " + proxyUrl)
		proxyURL, err := url.Parse(proxyUrl)
		if err != nil {
			showInfo("Download:" + "Invalid proxy URL - " + proxyUrl)
			return "", nil, err
		}

		httpClient = &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				Proxy: http.ProxyURL(proxyURL),
			},
		}
	}

	showInfo("Download:" + "Creating HTTP request for " + providerURL)
	req, err := http.NewRequest("GET", providerURL, nil)
	if err != nil {
		showInfo("Download:" + "Failed to create request - " + err.Error())
		return
	}

	req.Header.Set("User-Agent", Settings.UserAgent)

	showInfo("Download:" + "Sending HTTP request to " + providerURL)
	resp, err := httpClient.Do(req)
	if err != nil {
		showInfo("Download:" + "HTTP request failed - " + err.Error())
		return
	}
	defer resp.Body.Close()

	resp.Header.Set("User-Agent", Settings.UserAgent)

	showInfo("Download:" + "Received HTTP response with status " + strconv.Itoa(resp.StatusCode))
	
	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("%d: %s %s", resp.StatusCode, providerURL, http.StatusText(resp.StatusCode))
		showInfo("Download:" + "HTTP status " + strconv.Itoa(resp.StatusCode) + " - " + http.StatusText(resp.StatusCode))
		return
	}

	// Get filename from the header
	var index = strings.Index(resp.Header.Get("Content-Disposition"), "filename")

	if index > -1 {
		var headerFilename = resp.Header.Get("Content-Disposition")[index:]
		var value = strings.Split(headerFilename, `=`)
		var f = strings.Replace(value[1], `"`, "", -1)
		f = strings.Replace(f, `;`, "", -1)
		filename = f
		showInfo("Download:" + "Header filename " + filename)
	} else {
		var cleanFilename = strings.SplitN(getFilenameFromPath(providerURL), "?", 2)
		filename = cleanFilename[0]
		showInfo("Download:" + "Filename " + filename)
	}

	showInfo("Download:" + "Reading response body for " + providerURL)
	body, err = io.ReadAll(resp.Body)
	if err != nil {
		showInfo("Download:" + "Failed to read response body - " + err.Error())
		return
	}

	showInfo("Download:" + "Successfully downloaded " + strconv.Itoa(len(body)) + " bytes from " + providerURL)
	return
}
