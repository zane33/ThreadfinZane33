package src

import (
  "fmt"
  "log"
  "net"
  "os"
  "os/signal"
  "time"

  "github.com/koron/go-ssdp"
)

// SSDP : SSPD / DLNA Server
func SSDP() (err error) {

  if Settings.SSDP == false || System.Flag.Info == true {
    return
  }

  showInfo(fmt.Sprintf("SSDP / DLNA:%t", Settings.SSDP))

  quit := make(chan os.Signal, 1)
  signal.Notify(quit, os.Interrupt)

  ad, err := ssdp.Advertise(
    fmt.Sprintf("upnp:rootdevice"),                           // send as "ST"
    fmt.Sprintf("uuid:%s::upnp:rootdevice", System.DeviceID), // send as "USN"
    fmt.Sprintf("%s/device.xml", System.URLBase),             // send as "LOCATION"
    fmt.Sprintf("Linux/3.14 UPnP/1.0 %s/%s", System.Name, System.Version), // send as "SERVER"
    1800)           // send as "maxAge" in "CACHE-CONTROL"

  if err != nil {
    return
  }

  // Debug SSDP
  if System.Flag.Debug == 3 {
    ssdp.Logger = log.New(os.Stderr, "[SSDP] ", log.LstdFlags)
  }

  go func(adv *ssdp.Advertiser) {

    aliveTick := time.Tick(300 * time.Second)

  loop:
    for {

      select {

      case <-aliveTick:
        err = adv.Alive()
        if err != nil {
          ShowError(err, 0)
          adv.Bye()
          adv.Close()
          break loop
        }

      case <-quit:
        adv.Bye()
        adv.Close()
        os.Exit(0)
        break loop

      }

    }

  }(ad)

  return
}

// startUDPDiscovery starts UDP discovery service on port 65001 for HDHomeRun compatibility
func startUDPDiscovery() {
  go func() {
    addr, err := net.ResolveUDPAddr("udp", ":65001")
    if err != nil {
      ShowError(err, 0)
      return
    }

    conn, err := net.ListenUDP("udp", addr)
    if err != nil {
      ShowError(err, 0)
      return
    }
    defer conn.Close()

    showInfo("UDP Discovery service started on port 65001")

    for {
      buffer := make([]byte, 1024)
      n, clientAddr, err := conn.ReadFromUDP(buffer)
      if err != nil {
        ShowError(err, 0)
        continue
      }

      request := string(buffer[:n])
      
      // HDHomeRun discovery protocol - must match exact format
      if request == "getmyaddr" {
        response := fmt.Sprintf("getmyaddr\n%s\n", clientAddr.IP.String())
        conn.WriteToUDP([]byte(response), clientAddr)
      } else if request == "discover" {
        // HDHomeRun discovery response format
        response := fmt.Sprintf("discover\n%s %s\n", System.DeviceID, System.URLBase)
        conn.WriteToUDP([]byte(response), clientAddr)
      }
    }
  }()
}
