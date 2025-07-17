var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2)
        return parts.pop().split(";").shift();
    return "";
}
// WebSocket connection manager for efficient connection reuse
var WebSocketManager = /** @class */ (function () {
    function WebSocketManager() {
        this.ws = null;
        this.url = "";
        this.pendingRequests = new Map();
        this.reconnectTimer = null;
        this.lastCmd = "";
    }
    WebSocketManager.getInstance = function () {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    };
    WebSocketManager.prototype.createUrl = function () {
        var protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
        return protocol + window.location.hostname + ":" + window.location.port + "/data/" + "?Token=" + getCookie("Token");
    };
    WebSocketManager.prototype.connect = function () {
        var _this = this;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        this.url = this.createUrl();
        this.ws = new WebSocket(this.url);
        this.ws.onopen = function () {
            console.log("DEBUG: Persistent WebSocket connection established");
            WS_AVAILABLE = true;
            if (_this.reconnectTimer) {
                clearTimeout(_this.reconnectTimer);
                _this.reconnectTimer = null;
            }
        };
        this.ws.onmessage = function (e) {
            var response = JSON.parse(e.data);
            // Handle token updates
            if (response.hasOwnProperty("token")) {
                document.cookie = "Token=" + response["token"];
            }
            // Handle error responses
            if (response["status"] == false) {
                alert(response["err"]);
                if (response.hasOwnProperty("reload")) {
                    location.reload();
                }
                return;
            }
            // Handle probe info
            if (response.hasOwnProperty("probeInfo")) {
                if (document.getElementById("probeDetails")) {
                    if (response["probeInfo"]["resolution"] !== undefined) {
                        document.getElementById("probeDetails").innerHTML = "<p>Resolution: <span class='text-primary'>" + response["probeInfo"]["resolution"] + "</span></p><p>Frame Rate: <span class='text-primary'>" + response["probeInfo"]["frameRate"] + " FPS</span></p><p>Audio: <span class='text-primary'>" + response["probeInfo"]["audioChannel"] + "</span></p>";
                    }
                }
            }
            // Handle logo URL
            if (response.hasOwnProperty("logoURL")) {
                var div = document.getElementById("channel-icon");
                div.value = response["logoURL"];
                div.className = "changed";
                return;
            }
            // Get the last command that was sent
            var cmd = _this.getLastCmd();
            // Call any pending callbacks for the specific command
            var callback = _this.pendingRequests.get(cmd);
            if (callback) {
                callback(response);
                _this.pendingRequests.delete(cmd);
            }
            else {
                // Process response for specific commands like updateLog
                _this.processResponse(cmd, response);
            }
        };
        this.ws.onerror = function (e) {
            console.log("DEBUG: WebSocket error, will attempt reconnect");
            WS_AVAILABLE = false;
            if (WS_AVAILABLE == false) {
                alert("No websocket connection to Threadfin could be established. Check your network configuration.");
            }
        };
        this.ws.onclose = function () {
            console.log("DEBUG: WebSocket connection closed, scheduling reconnect");
            WS_AVAILABLE = false;
            _this.ws = null;
            // Reconnect after 5 seconds
            if (!_this.reconnectTimer) {
                _this.reconnectTimer = setTimeout(function () {
                    _this.connect();
                }, 5000);
            }
        };
    };
    WebSocketManager.prototype.getLastCmd = function () {
        return this.lastCmd;
    };
    WebSocketManager.prototype.processResponse = function (cmd, response) {
        switch (cmd) {
            case "updateLog":
                if (response.hasOwnProperty("log")) {
                    createClintInfo(response["log"]);
                }
                return;
            case "getServerConfig":
                console.log("KEYS: ", getObjKeys(response));
                SERVER = response;
                if (response.hasOwnProperty("settings")) {
                    console.log("SETTINGS");
                    createLayout();
                }
                if (response.hasOwnProperty("token")) {
                    console.log("TOKEN");
                }
                return;
            default:
                // Handle other commands
                SERVER = response;
                if (response.hasOwnProperty("settings")) {
                    createLayout();
                }
                break;
        }
        // Callbacks are handled in onmessage handler
    };
    WebSocketManager.prototype.sendRequest = function (cmd, data, callback) {
        var _this = this;
        this.lastCmd = cmd;
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.connect();
            // Retry after connection is established
            setTimeout(function () { return _this.sendRequest(cmd, data, callback); }, 1000);
            return;
        }
        var requestData = __assign(__assign({}, data), { cmd: cmd });
        if (callback) {
            this.pendingRequests.set(cmd, callback);
        }
        // Only log non-updateLog requests to reduce noise
        if (cmd !== "updateLog") {
            console.log("DEBUG: Sending request:", cmd);
            console.log("DEBUG: Request data:", requestData);
        }
        this.ws.send(JSON.stringify(requestData));
    };
    return WebSocketManager;
}());
var Server = /** @class */ (function () {
    function Server(cmd) {
        this.cmd = cmd;
        this.wsManager = WebSocketManager.getInstance();
    }
    Server.prototype.request = function (data) {
        var _this = this;
        // For save operations, use original one-time WebSocket connections
        // This ensures compatibility with server expectations
        if (this.cmd.startsWith("save") || this.cmd.includes("File")) {
            this.createOriginalWebSocket(data);
            return;
        }
        // Prevent multiple simultaneous non-updateLog requests
        if (SERVER_CONNECTION == true && this.cmd !== "updateLog") {
            return;
        }
        if (this.cmd !== "updateLog") {
            SERVER_CONNECTION = true;
            UNDO = new Object();
            // showElement("loading", true);
        }
        // Use efficient WebSocket manager for other requests
        this.wsManager.sendRequest(this.cmd, data, function (response) {
            _this.handleResponse(response);
        });
    };
    Server.prototype.createOriginalWebSocket = function (data) {
        var _this = this;
        if (this.cmd !== "updateLog") {
            SERVER_CONNECTION = true;
            UNDO = new Object();
            showElement("loading", true);
        }
        var protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
        var url = protocol + window.location.hostname + ":" + window.location.port + "/data/" + "?Token=" + getCookie("Token");
        var requestData = __assign(__assign({}, data), { cmd: this.cmd });
        var ws = new WebSocket(url);
        ws.onopen = function () {
            console.log("DEBUG: One-time WebSocket connection for:", _this.cmd);
            ws.send(JSON.stringify(requestData));
        };
        ws.onmessage = function (e) {
            var response = JSON.parse(e.data);
            console.log("DEBUG: One-time WebSocket response for:", _this.cmd);
            _this.handleResponse(response);
            ws.close();
        };
        ws.onerror = function (e) {
            console.log("DEBUG: One-time WebSocket error for:", _this.cmd);
            if (_this.cmd !== "updateLog") {
                SERVER_CONNECTION = false;
                showElement("loading", false);
            }
        };
        ws.onclose = function () {
            console.log("DEBUG: One-time WebSocket closed for:", _this.cmd);
        };
    };
    Server.prototype.handleResponse = function (response) {
        if (this.cmd !== "updateLog") {
            SERVER_CONNECTION = false;
            showElement("loading", false);
            // Only log non-updateLog responses to reduce noise
            console.log("DEBUG: Response received for:", this.cmd);
            console.log("DEBUG: Response data:", response);
        }
        // Process the response using the same logic as the old implementation
        this.processOldStyleResponse(response);
    };
    Server.prototype.processOldStyleResponse = function (response) {
        // Handle error responses
        if (response["status"] == false) {
            alert(response["err"]);
            if (response.hasOwnProperty("reload")) {
                location.reload();
            }
            return;
        }
        // Handle probe info
        if (response.hasOwnProperty("probeInfo")) {
            if (document.getElementById("probeDetails")) {
                if (response["probeInfo"]["resolution"] !== undefined) {
                    document.getElementById("probeDetails").innerHTML = "<p>Resolution: <span class='text-primary'>" + response["probeInfo"]["resolution"] + "</span></p><p>Frame Rate: <span class='text-primary'>" + response["probeInfo"]["frameRate"] + " FPS</span></p><p>Audio: <span class='text-primary'>" + response["probeInfo"]["audioChannel"] + "</span></p>";
                }
            }
        }
        // Handle logo URL
        if (response.hasOwnProperty("logoURL")) {
            var div = document.getElementById("channel-icon");
            div.value = response["logoURL"];
            div.className = "changed";
            return;
        }
        // Handle openMenu responses (for save operations)
        if (response.hasOwnProperty("openMenu")) {
            var menu = document.getElementById(response["openMenu"]);
            if (menu) {
                menu.click();
            }
            showElement("popup", false);
            showElement("loading", false);
            return;
        }
        // Handle openLink responses
        if (response.hasOwnProperty("openLink")) {
            window.location.href = response["openLink"];
            return;
        }
        // Handle alert responses
        if (response.hasOwnProperty("alert")) {
            alert(response["alert"]);
        }
        // Handle reload responses
        if (response.hasOwnProperty("reload")) {
            location.reload();
            return;
        }
        // Process based on the command that was sent
        switch (this.cmd) {
            case "getServerConfig":
                console.log("KEYS: ", getObjKeys(response));
                SERVER = response;
                if (response.hasOwnProperty("settings")) {
                    console.log("SETTINGS");
                    createLayout();
                }
                if (response.hasOwnProperty("token")) {
                    console.log("TOKEN");
                }
                break;
            case "saveFilesM3U":
            case "saveFilesXMLTV":
            case "saveFilesHDHR":
            case "saveUserData":
            case "saveNewUser":
                // For save operations, update SERVER and refresh menu
                SERVER = response;
                createLayout();
                break;
            default:
                // For other commands, just update SERVER
                SERVER = response;
                if (response.hasOwnProperty("settings")) {
                    createLayout();
                }
                break;
        }
    };
    return Server;
}());
