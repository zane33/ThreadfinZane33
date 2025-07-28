function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2)
        return parts.pop().split(";").shift();
    return "";
}
// WebSocket connection manager for efficient connection reuse
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.url = "";
        this.pendingRequests = new Map();
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.baseReconnectDelay = 1000;
        this.isConnecting = false;
        this.connectionState = 'disconnected';
        this.lastCmd = "";
    }
    static getInstance() {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }
    createUrl() {
        const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
        return protocol + window.location.hostname + ":" + window.location.port + "/data/" + "?Token=" + getCookie("Token");
    }
    connect() {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn("DEBUG: Maximum reconnection attempts reached. Stopping reconnections.");
            this.connectionState = 'error';
            WS_AVAILABLE = false;
            return;
        }
        this.isConnecting = true;
        this.connectionState = 'connecting';
        this.url = this.createUrl();
        console.log(`DEBUG: Attempting WebSocket connection (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.ws = new WebSocket(this.url);
        this.ws.onopen = () => {
            console.log("DEBUG: Persistent WebSocket connection established");
            this.isConnecting = false;
            this.connectionState = 'connected';
            this.reconnectAttempts = 0;
            WS_AVAILABLE = true;
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        };
        this.ws.onmessage = (e) => {
            const response = JSON.parse(e.data);
            // Handle token updates - reduce logging noise
            if (response.hasOwnProperty("token")) {
                document.cookie = "Token=" + response["token"];
                // Only log token updates in debug mode, not constantly
                if (window.location.search.includes('debug=true')) {
                    console.log("DEBUG: Token updated");
                }
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
            const cmd = this.getLastCmd();
            // Call any pending callbacks for the specific command
            const callback = this.pendingRequests.get(cmd);
            if (callback) {
                callback(response);
                this.pendingRequests.delete(cmd);
            }
            else {
                // Process response for specific commands like updateLog
                this.processResponse(cmd, response);
            }
        };
        this.ws.onerror = (e) => {
            console.warn("DEBUG: WebSocket error occurred", e);
            this.isConnecting = false;
            this.connectionState = 'error';
            WS_AVAILABLE = false;
            // Hide loading modal on connection error to prevent stuck state
            try {
                showElementSafe("loading", false);
            }
            catch (loadingError) {
                console.warn("Failed to hide loading on WebSocket error:", loadingError);
                forceCleanLoadingState();
            }
            // Only show alert on first connection attempt to avoid spam
            if (this.reconnectAttempts === 0) {
                console.error("DEBUG: Initial WebSocket connection failed. Will attempt reconnection.");
            }
        };
        this.ws.onclose = (event) => {
            console.log(`DEBUG: WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`);
            this.isConnecting = false;
            this.connectionState = 'disconnected';
            WS_AVAILABLE = false;
            this.ws = null;
            // Only attempt reconnection if we haven't exceeded max attempts
            if (this.reconnectAttempts < this.maxReconnectAttempts && !this.reconnectTimer) {
                const delay = this.calculateReconnectDelay();
                console.log(`DEBUG: Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
                this.reconnectTimer = setTimeout(() => {
                    this.reconnectAttempts++;
                    this.reconnectTimer = null;
                    this.connect();
                }, delay);
            }
        };
    }
    getLastCmd() {
        return this.lastCmd;
    }
    processResponse(cmd, response) {
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
    }
    sendRequest(cmd, data, callback) {
        this.lastCmd = cmd;
        // Check connection state and attempt connection if needed
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (this.connectionState === 'error' && this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.warn(`DEBUG: Cannot send request '${cmd}' - max reconnection attempts exceeded`);
                if (callback) {
                    callback({ status: false, err: "WebSocket connection failed after multiple attempts" });
                }
                return;
            }
            this.connect();
            // Retry with exponential backoff
            const retryDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 5000);
            setTimeout(() => this.sendRequest(cmd, data, callback), retryDelay);
            return;
        }
        const requestData = Object.assign(Object.assign({}, data), { cmd: cmd });
        if (callback) {
            this.pendingRequests.set(cmd, callback);
        }
        // Reduce logging noise - only log important commands
        if (cmd !== "updateLog" && cmd !== "getServerConfig") {
            console.log("DEBUG: Sending request:", cmd);
        }
        try {
            this.ws.send(JSON.stringify(requestData));
        }
        catch (error) {
            console.error(`DEBUG: Failed to send WebSocket request '${cmd}':`, error);
            if (callback) {
                callback({ status: false, err: "Failed to send request: " + error.message });
            }
        }
    }
    calculateReconnectDelay() {
        // Exponential backoff with jitter
        const exponentialDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
        const maxDelay = 30000; // Max 30 seconds
        const jitter = Math.random() * 1000; // Add up to 1 second jitter
        return Math.min(exponentialDelay + jitter, maxDelay);
    }
    getConnectionState() {
        return this.connectionState;
    }
    resetConnection() {
        console.log("DEBUG: Resetting WebSocket connection");
        this.reconnectAttempts = 0;
        this.connectionState = 'disconnected';
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connect();
    }
}
class Server {
    constructor(cmd) {
        this.loadingHandled = false;
        this.cmd = cmd;
        this.wsManager = WebSocketManager.getInstance();
        this.loadingHandled = false;
    }
    request(data) {
        // Prevent multiple simultaneous save operations
        if (this.cmd.startsWith("save")) {
            if (Server.activeSaveOperations.has(this.cmd)) {
                console.log(`DEBUG: Save operation '${this.cmd}' already in progress, skipping`);
                return;
            }
            Server.activeSaveOperations.add(this.cmd);
        }
        // For save operations, use original one-time WebSocket connections
        // This ensures compatibility with server expectations
        if (this.cmd.startsWith("save") || this.cmd.includes("File")) {
            this.createOriginalWebSocket(data);
            return;
        }
        // Prevent multiple simultaneous non-updateLog requests
        if (SERVER_CONNECTION == true && this.cmd !== "updateLog") {
            console.log(`DEBUG: Request '${this.cmd}' blocked - connection already active`);
            return;
        }
        if (this.cmd !== "updateLog") {
            SERVER_CONNECTION = true;
            UNDO = new Object();
            // Don't show loading for frequent operations
            if (this.cmd !== "getServerConfig") {
                showElement("loading", true);
            }
        }
        // Use efficient WebSocket manager for other requests
        this.wsManager.sendRequest(this.cmd, data, (response) => {
            this.handleResponse(response);
        });
    }
    createOriginalWebSocket(data) {
        if (this.cmd !== "updateLog") {
            SERVER_CONNECTION = true;
            UNDO = new Object();
            showElement("loading", true);
        }
        const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
        const url = protocol + window.location.hostname + ":" + window.location.port + "/data/" + "?Token=" + getCookie("Token");
        const requestData = Object.assign(Object.assign({}, data), { cmd: this.cmd });
        const ws = new WebSocket(url);
        ws.onopen = () => {
            console.log("DEBUG: One-time WebSocket connection for:", this.cmd);
            ws.send(JSON.stringify(requestData));
        };
        ws.onmessage = (e) => {
            const response = JSON.parse(e.data);
            console.log("DEBUG: One-time WebSocket response for:", this.cmd);
            this.handleResponse(response);
            ws.close();
        };
        ws.onerror = (e) => {
            console.log("DEBUG: One-time WebSocket error for:", this.cmd);
            if (this.cmd !== "updateLog") {
                SERVER_CONNECTION = false;
                showElement("loading", false);
            }
        };
        ws.onclose = () => {
            console.log("DEBUG: One-time WebSocket closed for:", this.cmd);
        };
    }
    handleResponse(response) {
        try {
            if (this.cmd !== "updateLog") {
                SERVER_CONNECTION = false;
                // Remove from active save operations
                if (this.cmd.startsWith("save")) {
                    Server.activeSaveOperations.delete(this.cmd);
                }
                // Reduce logging noise for frequent operations
                if (this.cmd !== "getServerConfig" && this.cmd !== "updateLog") {
                    console.log("DEBUG: Response received for:", this.cmd);
                }
            }
            // Process the response using the same logic as the old implementation
            this.processOldStyleResponse(response);
            // Hide loading only if it wasn't already handled by processOldStyleResponse
            if (this.cmd !== "updateLog" && !this.loadingHandled && this.cmd !== "getServerConfig") {
                showElementSafe("loading", false);
            }
        }
        catch (error) {
            console.error(`DEBUG: Error handling response for '${this.cmd}':`, error);
            // Cleanup on error
            if (this.cmd.startsWith("save")) {
                Server.activeSaveOperations.delete(this.cmd);
            }
            if (this.cmd !== "updateLog") {
                SERVER_CONNECTION = false;
                showElementSafe("loading", false);
            }
        }
    }
    processOldStyleResponse(response) {
        // Handle error responses
        if (response["status"] == false) {
            // For settings errors, show user-friendly feedback
            if (this.cmd === "saveSettings" && typeof showSettingsFeedback === 'function') {
                try {
                    showSettingsFeedback("error", "Failed to save settings: " + response["err"]);
                    this.restoreSaveButtonState();
                }
                catch (feedbackError) {
                    alert(response["err"]);
                }
            }
            else {
                alert(response["err"]);
            }
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
            // Mark that we've handled the loading state to prevent double-hide in handleResponse
            this.loadingHandled = true;
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
                SERVER = response;
                if (response.hasOwnProperty("settings")) {
                    this.debouncedCreateLayout();
                }
                break;
            case "saveFilesM3U":
            case "saveFilesXMLTV":
            case "saveFilesHDHR":
            case "saveUserData":
            case "saveNewUser":
            case "saveSettings":
                // For save operations, update SERVER but debounce layout refresh
                SERVER = response;
                // Only refresh layout for certain save operations to prevent loops
                if (this.cmd !== "saveSettings") {
                    this.debouncedCreateLayout();
                }
                // Clear changed flags on successful save
                if (this.cmd === "saveSettings") {
                    this.clearSettingsChangedFlags();
                    this.restoreSaveButtonState();
                    // Show success feedback
                    try {
                        if (typeof showSettingsFeedback === 'function') {
                            showSettingsFeedback("success", "Settings saved successfully!");
                        }
                    }
                    catch (feedbackError) {
                        console.warn("Could not show settings feedback:", feedbackError);
                    }
                }
                break;
            default:
                // For other commands, just update SERVER
                SERVER = response;
                if (response.hasOwnProperty("settings")) {
                    this.debouncedCreateLayout();
                }
                break;
        }
    }
    // Helper methods for settings save feedback
    clearSettingsChangedFlags() {
        try {
            var settingsDiv = document.getElementById("content_settings");
            if (settingsDiv) {
                var changedElements = settingsDiv.getElementsByClassName("changed");
                // Convert to array to avoid live collection issues
                var elementsArray = Array.from(changedElements);
                elementsArray.forEach(function (element) {
                    element.classList.remove("changed", "saving");
                });
                console.log("DEBUG: Cleared", elementsArray.length, "changed flags");
            }
        }
        catch (error) {
            console.error("Error clearing settings changed flags:", error);
        }
    }
    restoreSaveButtonState() {
        try {
            // Find save buttons and restore their state
            var saveButtons = document.querySelectorAll('input[type="button"][class*="saving"]');
            saveButtons.forEach(function (button) {
                button.disabled = false;
                button.classList.remove("saving");
                var originalText = button.getAttribute("data-original-text");
                if (originalText) {
                    button.value = originalText;
                    button.removeAttribute("data-original-text");
                }
                else {
                    button.value = "Save";
                }
            });
            console.log("DEBUG: Restored", saveButtons.length, "save button(s)");
        }
        catch (error) {
            console.error("Error restoring save button state:", error);
        }
    }
    // Debounced layout creation to prevent excessive refreshes
    debouncedCreateLayout() {
        const now = Date.now();
        if (now - Server.lastLayoutUpdate < Server.layoutUpdateDebounceDelay) {
            console.log("DEBUG: Layout update debounced");
            return;
        }
        Server.lastLayoutUpdate = now;
        try {
            // Ensure SERVER data is valid before creating layout
            if (!SERVER || typeof SERVER !== 'object') {
                console.warn("DEBUG: Invalid SERVER data, skipping layout creation");
                return;
            }
            createLayout();
        }
        catch (error) {
            console.error("DEBUG: Error in debouncedCreateLayout:", error);
        }
    }
}
Server.activeSaveOperations = new Set();
Server.lastLayoutUpdate = 0;
Server.layoutUpdateDebounceDelay = 500;
