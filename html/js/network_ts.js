class Server {
    constructor(cmd) {
        this.cmd = cmd;
    }
    request(data) {
        // Generate unique request ID for this specific request
        var requestId = Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        console.log("DEBUG: Starting request:", requestId, data);
        
        // Only block rapid duplicate requests of the same command (prevent double-clicking)
        var requestKey = data.cmd + "_" + (data.files ? JSON.stringify(data.files) : "");
        var now = Date.now();
        console.log("DEBUG: Request key:", requestKey, "Last request time:", window.lastRequestTime, "Now:", now);
        if (window.lastRequestTime && window.lastRequestKey === requestKey && 
            (now - window.lastRequestTime) < 1000) {
            console.log("DEBUG: Blocking duplicate request within 1 second:", requestKey);
            return;
        }
        window.lastRequestTime = now;
        window.lastRequestKey = requestKey;
        console.log("DEBUG: Request allowed to proceed");
        
        console.log(data);
        
        // Add timeout for this specific request - longer timeout for update operations
        var timeoutDuration = 45000; // Default 45 seconds
        if (this.cmd === "updateFileM3U" || this.cmd === "updateFileXMLTV" || this.cmd === "updateFileHDHR") {
            timeoutDuration = 300000; // 5 minutes for update operations
        }
        var connectionTimeout = setTimeout(function() {
            console.log("WebSocket connection timeout for request:", requestId);
            showElement("loading", false);
            // showNotification("Connection timeout. Please try again.", "error", 5000);
        }, timeoutDuration);
        
        if (this.cmd != "updateLog") {
            // showElement("loading", true)
            UNDO = new Object();
        }
        switch (window.location.protocol) {
            case "http:":
                this.protocol = "ws://";
                break;
            case "https:":
                this.protocol = "wss://";
                break;
        }
        var url = this.protocol + window.location.hostname + ":" + window.location.port + "/data/" + "?Token=" + getCookie("Token");
        console.log("DEBUG: WebSocket URL:", url);
        data["cmd"] = this.cmd;
        console.log("DEBUG: About to create WebSocket connection");
        var ws = new WebSocket(url);
        console.log("DEBUG: WebSocket created, setting up event handlers");
        ws.onopen = function () {
            WS_AVAILABLE = true;
            console.log("DEBUG: WebSocket connected successfully for request:", requestId);
            console.log("DEBUG: REQUEST (JS):");
            console.log(data);
            console.log("DEBUG: REQUEST: (JSON)");
            console.log(JSON.stringify(data));
            console.log("DEBUG: Sending data to server");
            this.send(JSON.stringify(data));
            console.log("DEBUG: Data sent to server");
        };
        ws.onerror = function (e) {
            console.log("DEBUG: WebSocket error occurred for request:", requestId);
            console.log("DEBUG: Error event:", e);
            console.log("DEBUG: No websocket connection to Threadfin could be established. Check your network configuration.");
            clearTimeout(connectionTimeout);
            if (WS_AVAILABLE == false) {
                // showNotification("No websocket connection to Threadfin could be established. Check your network configuration.", "error", 10000);
            }
        };
        ws.onmessage = function (e) {
            console.log("DEBUG: WebSocket message received for request:", requestId);
            clearTimeout(connectionTimeout);
            console.log("DEBUG: RESPONSE:");
            var response = JSON.parse(e.data);
            console.log("DEBUG: Parsed response:", response);
            if (response.hasOwnProperty("token")) {
                document.cookie = "Token=" + response["token"];
            }
            if (response["status"] == false) {
                // Dismiss loading on error
                showElement("loading", false);
                
                // Dismiss any loading notifications
                var existingNotifications = document.querySelectorAll('.error-notification.info');
                existingNotifications.forEach(function(notification) {
                    notification.remove();
                });
                
                // showNotification(response["err"], "error", 10000);
                console.log("DEBUG: Error response:", response["err"]);
                if (response.hasOwnProperty("reload")) {
                    location.reload();
                }
                return;
            }
            if (response.hasOwnProperty("probeInfo")) {
                if (document.getElementById("probeDetails")) {
                    if (response["probeInfo"]["resolution"] !== undefined) {
                        document.getElementById("probeDetails").innerHTML = "<p>Resolution: <span class='text-primary'>" + response["probeInfo"]["resolution"] + "</span></p><p>Frame Rate: <span class='text-primary'>" + response["probeInfo"]["frameRate"] + " FPS</span></p><p>Audio: <span class='text-primary'>" + response["probeInfo"]["audioChannel"] + "</span></p>";
                    }
                }
            }
            if (response.hasOwnProperty("logoURL")) {
                var div = document.getElementById("channel-icon");
                div.value = response["logoURL"];
                div.className = "changed";
                return;
            }
            switch (data["cmd"]) {
                case "updateLog":
                    SERVER["log"] = response["log"];
                    if (document.getElementById("content_log")) {
                        showLogs(false);
                    }
                    if (document.getElementById("playlist-connection-information")) {
                        let activeClass = "text-primary";
                        if (response["clientInfo"]["activePlaylist"] / response["clientInfo"]["totalPlaylist"] >= 0.6 && response["clientInfo"]["activePlaylist"] / response["clientInfo"]["totalPlaylist"] < 0.8) {
                            activeClass = "text-warning";
                        }
                        else if (response["clientInfo"]["activePlaylist"] / response["clientInfo"]["totalPlaylist"] >= 0.8) {
                            activeClass = "text-danger";
                        }
                        document.getElementById("playlist-connection-information").innerHTML = "Playlist Connections: <span class='" + activeClass + "'>" + response["clientInfo"]["activePlaylist"] + " / " + response["clientInfo"]["totalPlaylist"] + "</span>";
                    }
                    if (document.getElementById("client-connection-information")) {
                        let activeClass = "text-primary";
                        if (response["clientInfo"]["activeClients"] / response["clientInfo"]["totalClients"] >= 0.6 && response["clientInfo"]["activeClients"] / response["clientInfo"]["totalClients"] < 0.8) {
                            activeClass = "text-warning";
                        }
                        else if (response["clientInfo"]["activeClients"] / response["clientInfo"]["totalClients"] >= 0.8) {
                            activeClass = "text-danger";
                        }
                        document.getElementById("client-connection-information").innerHTML = "Client Connections: <span class='" + activeClass + "'>" + response["clientInfo"]["activeClients"] + " / " + response["clientInfo"]["totalClients"] + "</span>";
                    }
                    return;
                    break;
                default:
                    SERVER = new Object();
                    SERVER = response;
                    break;
            }
            if (response.hasOwnProperty("openMenu")) {
                var menu = document.getElementById(response["openMenu"]);
                menu.click();
                showElement("popup", false);
                showElement("loading", false);
                
                // Dismiss any loading notifications
                var existingNotifications = document.querySelectorAll('.error-notification.info');
                existingNotifications.forEach(function(notification) {
                    notification.remove();
                });
                
                // Show success notification for all save operations
                if (data["cmd"] === "saveFilesM3U" || data["cmd"] === "updateFileM3U") {
                    // showNotification("Playlist saved successfully!", "success", 3000);
                    console.log("DEBUG: Playlist saved successfully!");
                } else if (data["cmd"] === "saveFilesXMLTV" || data["cmd"] === "updateFileXMLTV") {
                    // showNotification("XMLTV file saved successfully!", "success", 3000);
                    console.log("DEBUG: XMLTV file saved successfully!");
                } else if (data["cmd"] === "saveSettings") {
                    // showNotification("Settings saved successfully!", "success", 3000);
                    console.log("DEBUG: Settings saved successfully!");
                } else if (data["cmd"] === "saveFilter") {
                    // showNotification("Filter saved successfully!", "success", 3000);
                    console.log("DEBUG: Filter saved successfully!");
                } else if (data["cmd"] === "saveUserData" || data["cmd"] === "saveNewUser") {
                    // showNotification("User saved successfully!", "success", 3000);
                    console.log("DEBUG: User saved successfully!");
                } else if (data["cmd"] === "saveEpgMapping") {
                    // showNotification("EPG mapping saved successfully!", "success", 3000);
                    console.log("DEBUG: EPG mapping saved successfully!");
                } else if (data["cmd"] === "saveFilesHDHR" || data["cmd"] === "updateFileHDHR") {
                    // showNotification("HDHomeRun tuner saved successfully!", "success", 3000);
                    console.log("DEBUG: HDHomeRun tuner saved successfully!");
                }
            }
            if (response.hasOwnProperty("openLink")) {
                window.location = response["openLink"];
            }
            if (response.hasOwnProperty("alert")) {
                alert(response["alert"]);
            }
            if (response.hasOwnProperty("reload")) {
                location.reload();
            }
            if (response.hasOwnProperty("wizard")) {
                createLayout();
                configurationWizard[response["wizard"]].createWizard();
                return;
            }
            // Dismiss loading for any remaining cases
            showElement("loading", false);
            createLayout();
        };
        ws.onclose = function (e) {
            console.log("WebSocket connection closed for request:", requestId);
            console.log("Close code:", e.code, "Close reason:", e.reason);
            clearTimeout(connectionTimeout);
            if (e.code !== 1000) {
                // showNotification("Connection closed unexpectedly. Please try again.", "error", 5000);
                console.log("DEBUG: Connection closed unexpectedly. Please try again.");
            }
        };
    }
}
function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2)
        return parts.pop().split(";").shift();
}
