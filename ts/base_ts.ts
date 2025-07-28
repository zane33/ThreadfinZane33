var SERVER = new Object()
var BULK_EDIT: Boolean = false
var COLUMN_TO_SORT: number
var INACTIVE_COLUMN_TO_SORT: number
var SEARCH_MAPPING = new Object()
var UNDO = new Object()
var SERVER_CONNECTION = false
var WS_AVAILABLE = false
var LOADING_ERROR_STATE = false
declare var bootstrap: any;
declare var ClipboardJS: any;

// Global error handler to prevent UI crashes
window.addEventListener('error', function(e) {
  console.error('Global error caught:', e.error);
  console.error('Error details:', e.filename, e.lineno, e.colno, e.message);
  
  // Hide loading modal on any error to prevent stuck state
  try {
    if (document.getElementById("loading") && document.getElementById("loading").classList.contains('show')) {
      console.warn("Hiding loading modal due to JavaScript error");
      showElementSafe("loading", false);
    }
  } catch (loadingError) {
    console.warn("Failed to hide loading on global error:", loadingError);
    forceCleanLoadingState();
  }
  
  // Don't prevent default behavior, just log and clean up
  return false;
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled promise rejection:', e.reason);
  
  // Hide loading modal on promise rejection to prevent stuck state
  try {
    if (document.getElementById("loading") && document.getElementById("loading").classList.contains('show')) {
      console.warn("Hiding loading modal due to promise rejection");
      showElementSafe("loading", false);
    }
  } catch (loadingError) {
    console.warn("Failed to hide loading on promise rejection:", loadingError);
    forceCleanLoadingState();
  }
});

const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
// new ClipboardJS('.copy-btn');
var clipboard = new ClipboardJS('.copy-btn');
clipboard.on('success', function(e) {
  const tooltip = bootstrap.Tooltip.getInstance(e.trigger);
  tooltip.setContent({ '.tooltip-inner': 'Copied!' });

});
clipboard.on('error', function(e) {
  console.log(e);
});

var popupModal = new bootstrap.Modal(document.getElementById("popup"), {
  keyboard: true,
  focus: true
})

var loadingModal = new bootstrap.Modal(document.getElementById("loading"), {
  keyboard: true,
  focus: true
})

// Menü
var menuItems = new Array()
menuItems.push(new MainMenuItem("playlist", "{{.mainMenu.item.playlist}}", "m3u.png", "{{.mainMenu.headline.playlist}}"))
menuItems.push(new MainMenuItem("xmltv", "{{.mainMenu.item.xmltv}}", "xmltv.png", "{{.mainMenu.headline.xmltv}}"))
menuItems.push(new MainMenuItem("filter", "{{.mainMenu.item.filter}}", "filter.png", "{{.mainMenu.headline.filter}}"))
menuItems.push(new MainMenuItem("mapping", "{{.mainMenu.item.mapping}}", "mapping.png", "{{.mainMenu.headline.mapping}}"))
menuItems.push(new MainMenuItem("users", "{{.mainMenu.item.users}}", "users.png", "{{.mainMenu.headline.users}}"))
menuItems.push(new MainMenuItem("settings", "{{.mainMenu.item.settings}}", "settings.png", "{{.mainMenu.headline.settings}}"))
menuItems.push(new MainMenuItem("log", "{{.mainMenu.item.log}}", "log.png", "{{.mainMenu.headline.log}}"))
menuItems.push(new MainMenuItem("logout", "{{.mainMenu.item.logout}}", "logout.png", "{{.mainMenu.headline.logout}}"))

// Kategorien für die Einstellungen
var settingsCategory = new Array()
settingsCategory.push(new SettingsCategoryItem("{{.settings.category.general}}", "ThreadfinAutoUpdate,ssdp,tuner,oneRequestPerTuner,epgSource,epgCategories,epgCategoriesColors,dummy,dummyChannel,ignoreFilters,api"))
settingsCategory.push(new SettingsCategoryItem("{{.settings.category.files}}", "update,files.update,temp.path,cache.images,bindIpAddress,httpThreadfinDomain,forceHttps,httpsPort,httpsThreadfinDomain,xepg.replace.missing.images,xepg.replace.channel.title,enableNonAscii"))
settingsCategory.push(new SettingsCategoryItem("{{.settings.category.streaming}}", "udpxy,buffer.size.kb,buffer.timeout,user.agent,ffmpeg.path,ffmpeg.options,ffmpeg.forceHttp,vlc.path,vlc.options"))
settingsCategory.push(new SettingsCategoryItem("{{.settings.category.backup}}", "backup.path,backup.keep"))
settingsCategory.push(new SettingsCategoryItem("{{.settings.category.authentication}}", "authentication.web,authentication.pms,authentication.m3u,authentication.xml,authentication.api"))

function showPopUpElement(elm) {

  showElement(elm, true)

  // setTimeout(function () {
  //   showElement("popup", true);
  // }, 10);

  return
}

function showElement(elmID, type) {
  if (elmID == "popup-custom" || elmID == "popup") {
    switch (type) {
      case true: 
        popupModal.show()
        break;
      case false: 
        popupModal.hide()
        break;
    }
  }

  if (elmID == "loading") {
    switch (type) {
      case true: 
        // Reduce console noise for loading operations
        if (window.location.search.includes('debug=true')) {
          console.log("DEBUG: Showing loading modal")
        }
        try {
          // Clear any existing error states
          clearLoadingError();
          
          // Ensure we're not already showing
          var loadingElement = document.getElementById("loading")
          if (!loadingElement.classList.contains('show')) {
            loadingModal.show()
            
            // Set timeout to force hide after 30 seconds to prevent stuck modal
            setTimeout(function() {
              if (loadingElement && loadingElement.classList.contains('show')) {
                console.warn("DEBUG: Force hiding stuck loading modal after timeout");
                showElementSafe("loading", false);
              }
            }, 30000);
          }
        } catch (error) {
          console.error("Error showing loading modal:", error)
          setLoadingError("Failed to show loading screen");
        }
        break;
      case false: 
        // Reduce console noise for loading operations
        if (window.location.search.includes('debug=true')) {
          console.log("DEBUG: Hiding loading modal")
        }
        try {
          // Clear any loading error state
          clearLoadingError();
          
          var loadingElement = document.getElementById("loading")
          if (!loadingElement) {
            console.warn("DEBUG: Loading element not found");
            return;
          }
          
          console.log("DEBUG: Loading element classes:", loadingElement.className)
          console.log("DEBUG: Loading element style display:", loadingElement.style.display)
          
          // Enhanced modal hiding with better error handling
          var hidden = false
          
          // Method 1: Use Bootstrap modal instance
          try {
            if (loadingModal && typeof loadingModal.hide === 'function') {
              loadingModal.hide()
              console.log("DEBUG: Called loadingModal.hide()")
              hidden = true
            }
          } catch (e) {
            console.warn("DEBUG: loadingModal.hide() failed:", e)
            setLoadingError("Failed to hide loading modal via Bootstrap instance");
          }
          
          // Method 2: Try to get fresh Bootstrap instance
          if (!hidden) {
            try {
              var modalInstance = bootstrap.Modal.getInstance(loadingElement)
              if (modalInstance) {
                modalInstance.hide()
                console.log("DEBUG: Called bootstrap.Modal.getInstance().hide()")
                hidden = true
              }
            } catch (e) {
              console.warn("DEBUG: Bootstrap getInstance failed:", e)
              setLoadingError("Failed to get Bootstrap modal instance");
            }
          }
          
          // Method 3: Force hide with direct DOM manipulation - ALWAYS run this as backup
          try {
            console.log("DEBUG: Force hiding modal with DOM manipulation")
            loadingElement.classList.remove('show')
            loadingElement.style.display = 'none'
            loadingElement.setAttribute('aria-hidden', 'true')
            loadingElement.removeAttribute('aria-modal')
            document.body.classList.remove('modal-open')
            document.body.style.overflow = ''
            document.body.style.paddingRight = ''
            
            // Force clean up all modal classes and states
            loadingElement.classList.remove('fade', 'show')
            
            console.log("DEBUG: DOM manipulation complete")
          } catch (domError) {
            console.error("DEBUG: DOM manipulation failed:", domError)
            setLoadingError("Critical error: Could not hide loading modal");
          }
          
          // Enhanced cleanup of backdrops and body styles
          try {
            var backdrops = document.querySelectorAll('.modal-backdrop')
            console.log("DEBUG: Found", backdrops.length, "backdrop(s) to remove")
            backdrops.forEach(function(backdrop, index) {
              try {
                if (backdrop.parentNode) {
                  backdrop.parentNode.removeChild(backdrop)
                  console.log("DEBUG: Removed backdrop", index + 1)
                }
              } catch (backdropError) {
                console.warn("DEBUG: Error removing backdrop", index + 1, ":", backdropError)
              }
            })
            // Ensure body classes are cleaned up
            document.body.classList.remove('modal-open')
            document.body.style.paddingRight = ''
            document.body.style.overflow = ''
            document.body.style.position = ''
          } catch (cleanupError) {
            console.warn("DEBUG: Error during immediate cleanup:", cleanupError)
            setLoadingError("Warning: Cleanup incomplete");
          }
          
          // Multiple delayed cleanup attempts for robustness
          var cleanupAttempts = [100, 500, 1000];
          cleanupAttempts.forEach(function(delay) {
            setTimeout(function() {
              try {
                var remainingBackdrops = document.querySelectorAll('.modal-backdrop')
                if (remainingBackdrops.length > 0) {
                  console.log("DEBUG: Delayed cleanup at", delay + "ms - removing", remainingBackdrops.length, "remaining backdrop(s)")
                  remainingBackdrops.forEach(function(backdrop) {
                    if (backdrop.parentNode) {
                      backdrop.parentNode.removeChild(backdrop)
                    }
                  })
                }
                // Final body cleanup
                document.body.classList.remove('modal-open')
                document.body.style.paddingRight = ''
                document.body.style.overflow = ''
                document.body.style.position = ''
              } catch (delayedCleanupError) {
                console.warn("DEBUG: Error during delayed cleanup at", delay + "ms:", delayedCleanupError)
              }
            }, delay)
          });
          
        } catch (e) {
          console.error("Error hiding loading modal:", e)
          setLoadingError("Critical error hiding loading modal: " + e.message);
          // Last resort - force everything clean
          forceCleanLoadingState();
        }
        break;
    }
  }
}

function changeButtonAction(element, buttonID, attribute) {
  var value = element.options[element.selectedIndex].value;
  document.getElementById(buttonID).setAttribute(attribute, value)
}

function getLocalData(dataType, id): object {
  var data = new Object()
  switch (dataType) {
    case "m3u":
      data = SERVER["settings"]["files"][dataType][id]
      break

    case "hdhr":
      data = SERVER["settings"]["files"][dataType][id]
      break

    case "filter":
    case "custom-filter":
    case "group-title":
      if (id == -1) {
        data["active"] = true
        data["liveEvent"] = false
        data["caseSensitive"] = false
        data["description"] = ""
        data["exclude"] = ""
        data["filter"] = ""
        data["include"] = ""
        data["name"] = ""
        data["type"] = "group-title"
        data["x-category"] = ""
        SERVER["settings"]["filter"][id] = data
      }
      data = SERVER["settings"]["filter"][id]
      break

    case "xmltv":
      data = SERVER["settings"]["files"][dataType][id]
      break

    case "users":
      data = SERVER["users"][id]["data"]
      break

    case "mapping":
      data = SERVER["xepg"]["epgMapping"][id]
      break

    case "m3uGroups":
      data = SERVER["data"]["playlist"]["m3u"]["groups"]
      break
  }

  return data
}

function getObjKeys(obj) {
  var keys = new Array();

  for (var i in obj) {
    if (obj.hasOwnProperty(i)) {
      keys.push(i);
    }
  }

  return keys;
}

function getOwnObjProps(object: Object): string[] {
  return object ? Object.getOwnPropertyNames(object) : []
}

function getAllSelectedChannels(): string[] {

  var channels: string[] = new Array()

  if (BULK_EDIT == false) {
    return channels
  }

  var trs = document.getElementById("content_table").getElementsByTagName("TR")

  for (var i = 1; i < trs.length; i++) {

    if ((trs[i] as HTMLElement).style.display != "none") {

      if ((trs[i].firstChild.firstChild as HTMLInputElement).checked == true) {
        channels.push(trs[i].id)
      }

    }

  }

  var trs_inactive = document.getElementById("inactive_content_table").getElementsByTagName("TR")

  for (var i = 1; i < trs_inactive.length; i++) {

    if ((trs_inactive[i] as HTMLElement).style.display != "none") {

      if ((trs_inactive[i].firstChild.firstChild as HTMLInputElement).checked == true) {
        channels.push(trs_inactive[i].id)
      }

    }

  }

  return channels
}

function selectAllChannels(table_name = "content_table") {

  var bulk: Boolean = false
  var trs = document.getElementById(table_name).getElementsByTagName("TR")

  if ((trs[0].firstChild.firstChild as HTMLInputElement).checked == true) {
    bulk = true
  }

  for (var i = 1; i < trs.length; i++) {

    if ((trs[i] as HTMLElement).style.display != "none") {

      switch (bulk) {

        case true:
          (trs[i].firstChild.firstChild as HTMLInputElement).checked = true
          break

        case false:
          (trs[i].firstChild.firstChild as HTMLInputElement).checked = false
          break

      }

    }

  }

  return
}

function bulkEdit() {

  BULK_EDIT = !BULK_EDIT
  var className: string
  var rows = document.getElementsByClassName("bulk");

  switch (BULK_EDIT) {
    case true:
      className = "bulk showBulk"
      break;

    case false:
      className = "bulk hideBulk"
      break;
  }

  for (var i = 0; i < rows.length; i++) {
    rows[i].className = className;
    (rows[i] as HTMLInputElement).checked = false
  }

  return
}

function sortTable(column, table_name = "content_table") {
  // console.log("COLUMN: " + column);

  if ((column == COLUMN_TO_SORT && table_name == "content_table") || (column == INACTIVE_COLUMN_TO_SORT && table_name == "inactive_content_table")) {
    return;
  }


  var table = document.getElementById(table_name);
  var tableHead = table.getElementsByTagName("TR")[0];
  var tableItems = tableHead.getElementsByTagName("TD");

  var sortObj = new Object();
  var x, xValue;
  var tableHeader
  var sortByString = false

  if (column > 0 && COLUMN_TO_SORT > 0 && table_name == "content_table") {
    tableItems[COLUMN_TO_SORT].className = "pointer";
    tableItems[column].className = "sortThis";
  } else if (column > 0 && INACTIVE_COLUMN_TO_SORT > 0 && table_name == "inactive_content_table") {
    tableItems[INACTIVE_COLUMN_TO_SORT].className = "pointer";
    tableItems[column].className = "sortThis";
  }

  if (table_name == "content_table") {
    COLUMN_TO_SORT = column;
  } else if (table_name == "inactive_content_table") {
    INACTIVE_COLUMN_TO_SORT = column;
  }



  var rows = (table as HTMLTableElement).rows;

  if (rows[1] != undefined) {
    tableHeader = rows[0]

    x = rows[1].getElementsByTagName("TD")[column];

    for (i = 1; i < rows.length; i++) {

      x = rows[i].getElementsByTagName("TD")[column];

      switch (x.childNodes[0].tagName.toLowerCase()) {
        case "input":
          xValue = x.getElementsByTagName("INPUT")[0].value.toLowerCase();
          break;

        case "p":
          xValue = x.getElementsByTagName("P")[0].innerText.toLowerCase();
          break;

        default: console.log(x.childNodes[0].tagName);
      }

      if (xValue == "") {

        xValue = i
        sortObj[i] = rows[i];

      } else {

        switch (isNaN(xValue)) {
          case false:

            xValue = parseFloat(xValue);
            sortObj[xValue] = rows[i]
            break;

          case true:

            sortByString = true
            sortObj[xValue.toLowerCase() + i] = rows[i]
            break;

        }

      }

    }

    while (table.firstChild) {
      table.removeChild(table.firstChild);
    }

    var sortValues = getObjKeys(sortObj)

    if (sortByString == true) {
      if (column == 3) {
        var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
        sortValues.sort(collator.compare)
      } else {
        sortValues.sort()
      }
    } else {
      function sortFloat(a, b) {
        return a - b;
      }
      sortValues.sort(sortFloat);
    }

    table.appendChild(tableHeader)

    for (var i = 0; i < sortValues.length; i++) {

      table.appendChild(sortObj[sortValues[i]])

    }

  }

  return
}

function createSearchObj() {

  SEARCH_MAPPING = new Object()
  
  // Safety check to ensure SERVER data is loaded
  if (!SERVER || !SERVER["xepg"] || !SERVER["xepg"]["epgMapping"]) {
    // Reduce console noise for expected condition
    return;
  }
  
  try {
  
  var data = SERVER["xepg"]["epgMapping"]
  var channels = getObjKeys(data)

  var channelKeys: string[] = ["x-active", "x-channelID", "x-name", "_file.m3u.name", "x-group-title", "x-xmltv-file"]

  channels.forEach(id => {

    channelKeys.forEach(key => {

      if (key == "x-active") {

        switch (data[id][key]) {
          case true:
            SEARCH_MAPPING[id] = "online "
            break;

          case false:
            SEARCH_MAPPING[id] = "offline "
            break;

        }

      } else {

        if (key == "x-xmltv-file") {
          var xmltvFile = getValueFromProviderFile(data[id][key], "xmltv", "name")

          if (xmltvFile != undefined) {
            SEARCH_MAPPING[id] = SEARCH_MAPPING[id] + xmltvFile + " "
          }

        } else {
          SEARCH_MAPPING[id] = SEARCH_MAPPING[id] + data[id][key] + " "
        }


      }

    })

  })
  
  } catch (error) {
    console.error("Error creating search object:", error);
    SEARCH_MAPPING = new Object(); // Reset to empty object on error
  }

  return
}

function enableGroupSelection(selector) {
  var lastcheck = null // no checkboxes clicked yet

  // get desired checkboxes
  var checkboxes = document.querySelectorAll(selector)
  // loop over checkboxes to add event listener
  Array.prototype.forEach.call(checkboxes, function (cbx, idx) {
    cbx.addEventListener('click', function (evt) {
      // test for shift key, not first checkbox, and not same checkbox
      if (evt.shiftKey && null !== lastcheck && idx !== lastcheck) {
        // get range of checks between last-checkbox and shift-checkbox
        // Math.min/max does our sorting for us
        Array.prototype.slice.call(checkboxes, Math.min(lastcheck, idx), Math.max(lastcheck, idx))
          // and loop over each
          .forEach(function (ccbx) {
            ccbx.checked = true
          })
      }
      lastcheck = idx // set this checkbox as last-checked for later
    })
  })
}

function searchInMapping() {

  var searchValue = (document.getElementById("searchMapping") as HTMLInputElement).value;
  var trs = document.getElementById("content_table").getElementsByTagName("TR")

  for (var i = 1; i < trs.length; ++i) {

    var id = trs[i].getAttribute("id")
    var element = SEARCH_MAPPING[id]

    switch (element.toLowerCase().includes(searchValue.toLowerCase())) {
      case true:
        document.getElementById(id).style.display = ""
        break;

      case false:
        document.getElementById(id).style.display = "none"
        break;
    }


  }

  return
}

function changeChannelNumbers(elements) {
  var starting_number_element = (document.getElementsByName("x-channels-start")[0] as HTMLInputElement)
  var elems = elements.split(",")
  var starting_number = parseFloat(starting_number_element.value)
  var data = SERVER["xepg"]["epgMapping"]
  elems.forEach(element => {
    var elem = document.getElementById(element)
    var input = (elem.childNodes[1].firstChild as HTMLInputElement)
    input.value = starting_number.toString()
    data[element]["x-channelID"] = starting_number.toString()
    starting_number++
  })
  if (COLUMN_TO_SORT == 1) {
    COLUMN_TO_SORT = -1
    sortTable(1)
  }
  if (INACTIVE_COLUMN_TO_SORT == 1) {
    INACTIVE_COLUMN_TO_SORT = -1
    sortTable(1, "inactive_content_page")
  }
}

function changeChannelNumber(element) {

  var dbID = element.parentNode.parentNode.id

  var newNumber: number = parseFloat(element.value)
  var channelNumbers: number[] = []
  var data = SERVER["xepg"]["epgMapping"]
  var channels = getObjKeys(data)

  if (isNaN(newNumber)) {
    alert("{{.alert.invalidChannelNumber}}")
    return
  }

  channels.forEach(id => {

    var channelNumber = parseFloat(data[id]["x-channelID"])
    channelNumbers.push(channelNumber)

  })

  for (var i = 0; i < channelNumbers.length; i++) {

    if (channelNumbers.indexOf(newNumber) == -1) {
      break
    }

    if (Math.floor(newNumber) == newNumber) {
      newNumber = newNumber + 1
    } else {
      newNumber = newNumber + 0.1;
      newNumber.toFixed(1)
      newNumber = Math.round(newNumber * 10) / 10
    }

  }

  data[dbID]["x-channelID"] = newNumber.toString()
  element.value = newNumber

  if (COLUMN_TO_SORT == 1) {
    COLUMN_TO_SORT = -1
    sortTable(1)
  }

  if (INACTIVE_COLUMN_TO_SORT == 1) {
    INACTIVE_COLUMN_TO_SORT = -1
    sortTable(1, "inactive_content_page")
  }

  return
}

function backup() {

  var data = new Object()
  console.log("Backup data")

  var cmd = "ThreadfinBackup"

  console.log("SEND TO SERVER");
  console.log(data)

  var server: Server = new Server(cmd)
  server.request(data)

  return
}

function toggleChannelStatus(id: string) {

  var element: any
  var status: boolean

  if (document.getElementById("active")) {
    var checkbox = (document.getElementById("active") as HTMLInputElement)
    status = (checkbox).checked
  }


  var ids: string[] = getAllSelectedChannels()
  if (ids.length == 0) {
    ids.push(id)
  }

  ids.forEach(id => {

    var channel = SERVER["xepg"]["epgMapping"][id]

    channel["x-active"] = status

    switch (channel["x-active"]) {
      case true:
        if (channel["x-xmltv-file"] == "-" || channel["x-mapping"] == "-") {

          if (BULK_EDIT == false) {
            // alert(channel["x-name"] + ": Missing XMLTV file / channel")
            checkbox.checked = true
          }

          channel["x-active"] = true

        }

        break

      case false:
        // code...
        break;
    }

    if (channel["x-active"] == false) {
      document.getElementById(id).className = "notActiveEPG"
    } else {
      document.getElementById(id).className = "activeEPG"
    }

  });

}

function restore() {

  if (document.getElementById('upload')) {
    document.getElementById('upload').remove()
  }

  var restore = document.createElement("INPUT");
  restore.setAttribute("type", "file");
  restore.setAttribute("class", "notVisible");
  restore.setAttribute("name", "");
  restore.id = "upload";

  document.body.appendChild(restore);
  restore.click();

  restore.onchange = function () {

    var filename = (restore as HTMLInputElement).files[0].name
    var check = confirm("File: " + filename + "\n{{.confirm.restore}}");

    if (check == true) {

      var reader = new FileReader();
      var file = (document.querySelector('input[type=file]') as HTMLInputElement).files[0];

      if (file) {

        reader.readAsDataURL(file);
        reader.onload = function () {
          console.log(reader.result);
          var data = new Object();
          var cmd = "ThreadfinRestore"
          data["base64"] = reader.result

          var server: Server = new Server(cmd)
          server.request(data)

        };

      } else {
        alert("File could not be loaded")
      }

      restore.remove()
      return
    }

  }

  return
}

function uploadLogo() {

  if (document.getElementById('upload')) {
    document.getElementById('upload').remove()
  }

  var upload = document.createElement("INPUT");
  upload.setAttribute("type", "file");
  upload.setAttribute("class", "notVisible");
  upload.setAttribute("name", "");
  upload.id = "upload";

  document.body.appendChild(upload);
  upload.click();

  upload.onblur = function () {
    alert()
  }

  upload.onchange = function () {

    var filename = (upload as HTMLInputElement).files[0].name

    var reader = new FileReader();
    var file = (document.querySelector('input[type=file]') as HTMLInputElement).files[0];

    if (file) {

      reader.readAsDataURL(file);
      reader.onload = function () {
        console.log(reader.result);
        var data = new Object();
        var cmd = "uploadLogo"
        data["base64"] = reader.result
        data["filename"] = file.name

        var server: Server = new Server(cmd)
        server.request(data)

        var updateLogo = (document.getElementById('update-icon') as HTMLInputElement)
        updateLogo.checked = false
        updateLogo.className = "changed"

      };

    } else {
      alert("File could not be loaded")
    }

    upload.remove()
    return
  }

}

function probeChannel(url: string) {

  if (document.getElementById("probeDetails")) {
    document.getElementById("probeDetails").innerHTML = "Probing Channel Details..."
  }
  
  var data = new Object()
  var cmd = "probeChannel"
  data["probeUrl"] = url

  var server: Server = new Server(cmd)
  server.request(data)

  return
}

function checkUndo(key: string) {

  switch (key) {
    case "epgMapping":
      if (UNDO.hasOwnProperty(key)) {
        if (SERVER && SERVER["xepg"] && SERVER["xepg"][key] !== undefined) {
          SERVER["xepg"][key] = JSON.parse(JSON.stringify(UNDO[key]))
        }
      } else {
        if (SERVER && SERVER["xepg"] && SERVER["xepg"][key] !== undefined) {
          UNDO[key] = JSON.parse(JSON.stringify(SERVER["xepg"][key]));
        }
      }
      break;

    default:

      break;
  }

  return
}

function sortSelect(elem) {

  var tmpAry = [];
  var selectedValue = elem[elem.selectedIndex].value;

  for (var i = 0; i < elem.options.length; i++) tmpAry.push(elem.options[i]);

  tmpAry.sort(function (a, b) { return (a.text < b.text) ? -1 : 1; });
  while (elem.options.length > 0) elem.options[0] = null;

  var newSelectedIndex = 0;

  for (var i = 0; i < tmpAry.length; i++) {

    elem.options[i] = tmpAry[i];
    if (elem.options[i].value == selectedValue) newSelectedIndex = i;

  }

  elem.selectedIndex = newSelectedIndex; // Set new selected index after sorting
  return;
}

function updateLog() {
  // Reduce console noise - remove constant TOKEN logging
  var server: Server = new Server("updateLog")
  server.request(new Object())
}

// Loading modal error handling utilities
function setLoadingError(message: string) {
  LOADING_ERROR_STATE = true;
  console.error("Loading Modal Error:", message);
}

function clearLoadingError() {
  LOADING_ERROR_STATE = false;
}

function isLoadingInErrorState(): boolean {
  return LOADING_ERROR_STATE;
}

function forceCleanLoadingState() {
  console.warn("DEBUG: Force cleaning all loading state");
  try {
    // Force remove all modal-related classes from body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.position = '';
    
    // Force hide loading element
    var loadingElement = document.getElementById("loading");
    if (loadingElement) {
      loadingElement.style.display = 'none';
      loadingElement.classList.remove('show', 'fade');
      loadingElement.setAttribute('aria-hidden', 'true');
      loadingElement.removeAttribute('aria-modal');
    }
    
    // Force remove all backdrops
    var allBackdrops = document.querySelectorAll('.modal-backdrop');
    allBackdrops.forEach(function(backdrop) {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    });
    
    console.log("DEBUG: Force clean complete");
  } catch (error) {
    console.error("DEBUG: Force clean failed:", error);
  }
}

// Enhanced showElement with error recovery
function showElementSafe(elmID: string, type: boolean, retryCount: number = 0) {
  try {
    showElement(elmID, type);
  } catch (error) {
    console.error("Error in showElementSafe:", error);
    if (elmID === "loading" && !type && retryCount < 3) {
      console.log("DEBUG: Retrying loading modal hide, attempt", retryCount + 1);
      setTimeout(function() {
        showElementSafe(elmID, type, retryCount + 1);
      }, 1000);
    } else if (elmID === "loading" && !type) {
      // Final fallback for stuck loading modal
      console.warn("DEBUG: All retry attempts failed, force cleaning");
      forceCleanLoadingState();
    }
  }
}
