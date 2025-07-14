package src

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"

	up2date "threadfin/src/internal/up2date/client"

	"github.com/hashicorp/go-version"

	"reflect"
)

// BinaryUpdate : Binary Update Prozess. Git Branch master und beta wird von GitHub geladen.
func BinaryUpdate() (err error) {

	if !System.GitHub.Update {
		showWarning(2099)
		return
	}

	if !Settings.ThreadfinAutoUpdate {
		showWarning(2098)
		return
	}

	var debug string

	var updater = &up2date.Updater
	updater.Name = System.Update.Name
	updater.Branch = System.Branch

	up2date.Init()

	log.Println("BRANCH: ", System.Branch)
	switch System.Branch {

	// Update von GitHub
	case "Main", "Beta":
		var releaseInfo = fmt.Sprintf("%s/releases", System.Update.Github)
		var latest string
		var body []byte

		var git []*GithubReleaseInfo

		resp, err := http.Get(releaseInfo)
		if err != nil {
			ShowError(err, 6003)
			return nil
		}

		body, _ = io.ReadAll(resp.Body)

		err = json.Unmarshal(body, &git)
		if err != nil {
			return err
		}

		// Get latest prerelease tag name
		if System.Branch == "Beta" {
			for _, release := range git {
				if release.Prerelease {
					latest = release.TagName
					updater.Response.Version = release.TagName
					break
				}
			}
		}

		// Latest main tag name
		if System.Branch == "Main" {
			for _, release := range git {
				if !release.Prerelease {
					updater.Response.Version = release.TagName
					latest = release.TagName
					log.Println("TAG LATEST: ", release.TagName)
					break
				}
			}
		}

		// Check if we found a valid release
		if latest == "" || updater.Response.Version == "" {
			showInfo(fmt.Sprintf("No valid %s release found on GitHub", System.Branch))
			return nil
		}

		var File = fmt.Sprintf("%s/releases/download/%s/%s_%s_%s", System.Update.Git, latest, "Threadfin", System.OS, System.ARCH)

		updater.Response.Status = true
		updater.Response.UpdateBIN = File

		log.Println("FILE: ", updater.Response.UpdateBIN)

	// Update vom eigenen Server
	default:

		updater.URL = Settings.UpdateURL

		if len(updater.URL) == 0 {
			showInfo(fmt.Sprintf("Update URL:No server URL specified, update will not be performed. Branch: %s", System.Branch))
			return
		}

		showInfo("Update URL:" + updater.URL)
		fmt.Println("-----------------")

		// Versionsinformationen vom Server laden
		err = up2date.GetVersion()
		if err != nil {

			debug = fmt.Sprintf(err.Error())
			showDebug(debug, 1)

			return nil
		}

		if len(updater.Response.Reason) > 0 {

			err = fmt.Errorf(fmt.Sprintf("Update Server: %s", updater.Response.Reason))
			ShowError(err, 6002)

			return nil
		}

	}

	var currentVersion = System.Version + "." + System.Build
	current_version, err := version.NewVersion(currentVersion)
	if err != nil {
		showInfo(fmt.Sprintf("Invalid current version format: %s", currentVersion))
		return nil
	}
	
	response_version, err := version.NewVersion(updater.Response.Version)
	if err != nil {
		showInfo(fmt.Sprintf("Invalid response version format: %s", updater.Response.Version))
		return nil
	}
	
	// Versionsnummer überprüfen
	if response_version.GreaterThan(current_version) && updater.Response.Status {
		if Settings.ThreadfinAutoUpdate {
			// Update durchführen
			var fileType, url string

			showInfo(fmt.Sprintf("Update Available:Version: %s", updater.Response.Version))

			switch System.Branch {

			// Update von GitHub
			case "master", "beta":
				showInfo("Update Server:GitHub")

			// Update vom eigenen Server
			default:
				showInfo(fmt.Sprintf("Update Server:%s", Settings.UpdateURL))

			}

			showInfo(fmt.Sprintf("Start Update:Branch: %s", updater.Branch))

			// Neue Version als BIN Datei herunterladen
			if len(updater.Response.UpdateBIN) > 0 {
				url = updater.Response.UpdateBIN
				fileType = "bin"
			}

			// Neue Version als ZIP Datei herunterladen
			if len(updater.Response.UpdateZIP) > 0 {
				url = updater.Response.UpdateZIP
				fileType = "zip"
			}

			if len(url) > 0 {

				err = up2date.DoUpdate(fileType, updater.Response.Filename)
				if err != nil {
					ShowError(err, 6002)
				}

			}

		} else {
			// Hinweis ausgeben
			showWarning(6004)
		}

	}

	return nil
}

func conditionalUpdateChanges() (err error) {

checkVersion:
	settingsMap, err := loadJSONFileToMap(System.File.Settings)
	if err != nil || len(settingsMap) == 0 {
		return
	}

	if settingsVersion, ok := settingsMap["version"].(string); ok {

		if settingsVersion > System.DBVersion {
			showInfo("Settings DB Version:" + settingsVersion)
			showInfo("System DB Version:" + System.DBVersion)
			err = errors.New(getErrMsg(1031))
			return
		}

		// Letzte Kompatible Version (1.4.4)
		if settingsVersion < System.Compatibility {
			err = errors.New(getErrMsg(1013))
			return
		}

		switch settingsVersion {

		case "1.4.4":
			// UUID Wert in xepg.json setzen
			err = setValueForUUID()
			if err != nil {
				return
			}

			// Neuer Filter (WebUI). Alte Filtereinstellungen werden konvertiert
			if oldFilter, ok := settingsMap["filter"].([]interface{}); ok {
				var newFilterMap = convertToNewFilter(oldFilter)
				settingsMap["filter"] = newFilterMap

				settingsMap["version"] = "2.0.0"

				err = saveMapToJSONFile(System.File.Settings, settingsMap)
				if err != nil {
					return
				}

				goto checkVersion

			} else {
				err = errors.New(getErrMsg(1030))
				return
			}

		case "2.0.0":

			if oldBuffer, ok := settingsMap["buffer"].(bool); ok {

				var newBuffer string
				switch oldBuffer {
				case true:
					newBuffer = "threadfin"
				case false:
					newBuffer = "-"
				}

				settingsMap["buffer"] = newBuffer

				settingsMap["version"] = "2.1.0"

				err = saveMapToJSONFile(System.File.Settings, settingsMap)
				if err != nil {
					return
				}

				goto checkVersion

			} else {
				err = errors.New(getErrMsg(1030))
				return
			}

		case "2.1.0":
			// Falls es in einem späteren Update Änderungen an der Datenbank gibt, geht es hier weiter

			break
		}

	} else {
		// settings.json ist zu alt (älter als Version 1.4.4)
		err = errors.New(getErrMsg(1013))
	}

	return
}

func convertToNewFilter(oldFilter []interface{}) (newFilterMap map[int]interface{}) {

	newFilterMap = make(map[int]interface{})

	switch reflect.TypeOf(oldFilter).Kind() {

	case reflect.Slice:
		s := reflect.ValueOf(oldFilter)

		for i := 0; i < s.Len(); i++ {

			var newFilter FilterStruct
			newFilter.Active = true
			newFilter.Name = fmt.Sprintf("Custom filter %d", i+1)
			newFilter.Filter = s.Index(i).Interface().(string)
			newFilter.Type = "custom-filter"
			newFilter.CaseSensitive = false

			newFilterMap[i] = newFilter

		}

	}

	return
}

func setValueForUUID() (err error) {

	xepg, err := loadJSONFileToMap(System.File.XEPG)

	for _, c := range xepg {

		var xepgChannel = c.(map[string]interface{})

		if uuidKey, ok := xepgChannel["_uuid.key"].(string); ok {

			if value, ok := xepgChannel[uuidKey].(string); ok {

				if len(value) > 0 {
					xepgChannel["_uuid.value"] = value
				}

			}

		}

	}

	err = saveMapToJSONFile(System.File.XEPG, xepg)

	return
}
