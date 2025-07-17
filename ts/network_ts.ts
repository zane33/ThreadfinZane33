// Cookie utility function
declare function createClintInfo(obj: any): void;

function getCookie(name: string): string {
  var value = "; " + document.cookie;
  var parts = value.split("; " + name + "=");
  if (parts.length == 2) return parts.pop().split(";").shift();
  return "";
}

// WebSocket connection manager for efficient connection reuse
class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private url: string = "";
  private pendingRequests: Map<string, Function> = new Map();
  private reconnectTimer: number | null = null;

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  private createUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    return protocol + window.location.hostname + ":" + window.location.port + "/data/" + "?Token=" + getCookie("Token");
  }

  private connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.url = this.createUrl();
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("DEBUG: Persistent WebSocket connection established");
      WS_AVAILABLE = true;
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (e) => {
      const response = JSON.parse(e.data);
      
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
        var div = (document.getElementById("channel-icon") as HTMLInputElement);
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
      } else {
        // Process response for specific commands like updateLog
        this.processResponse(cmd, response);
      }
    };

    this.ws.onerror = (e) => {
      console.log("DEBUG: WebSocket error, will attempt reconnect");
      WS_AVAILABLE = false;
      if (WS_AVAILABLE == false) {
        alert("No websocket connection to Threadfin could be established. Check your network configuration.");
      }
    };

    this.ws.onclose = () => {
      console.log("DEBUG: WebSocket connection closed, scheduling reconnect");
      WS_AVAILABLE = false;
      this.ws = null;
      
      // Reconnect after 5 seconds
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 5000);
      }
    };
  }

  private lastCmd: string = "";
  
  private getLastCmd(): string {
    return this.lastCmd;
  }

  private processResponse(cmd: string, response: any): void {
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

  sendRequest(cmd: string, data: Object, callback?: Function): void {
    this.lastCmd = cmd;
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      // Retry after connection is established
      setTimeout(() => this.sendRequest(cmd, data, callback), 1000);
      return;
    }

    const requestData = { ...data, cmd: cmd };
    
    if (callback) {
      this.pendingRequests.set(cmd, callback);
    }

    // Only log non-updateLog requests to reduce noise
    if (cmd !== "updateLog") {
      console.log("DEBUG: Sending request:", cmd);
      console.log("DEBUG: Request data:", requestData);
    }

    this.ws.send(JSON.stringify(requestData));
  }
}

class Server {
  protocol: string;
  cmd: string;
  private wsManager: WebSocketManager;

  constructor(cmd: string) {
    this.cmd = cmd;
    this.wsManager = WebSocketManager.getInstance();
  }

  request(data: Object): any {
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
    this.wsManager.sendRequest(this.cmd, data, (response: any) => {
      this.handleResponse(response);
    });
  }

  private createOriginalWebSocket(data: Object): void {
    if (this.cmd !== "updateLog") {
      SERVER_CONNECTION = true;
      UNDO = new Object();
      showElement("loading", true);
    }

    const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const url = protocol + window.location.hostname + ":" + window.location.port + "/data/" + "?Token=" + getCookie("Token");
    
    const requestData = { ...data, cmd: this.cmd };
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

  private handleResponse(response: any): void {
    if (this.cmd !== "updateLog") {
      SERVER_CONNECTION = false;
      showElement("loading", false);
      
      // Only log non-updateLog responses to reduce noise
      console.log("DEBUG: Response received for:", this.cmd);
      console.log("DEBUG: Response data:", response);
    }
    
    // Process the response using the same logic as the old implementation
    this.processOldStyleResponse(response);
  }
  
  private processOldStyleResponse(response: any): void {
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
      var div = (document.getElementById("channel-icon") as HTMLInputElement);
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
  }
}