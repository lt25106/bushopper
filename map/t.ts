const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
if (mobile) window.location.href = "https://mobilebushopper.netlify.app"

import L from "leaflet"
import { maptilerLayer, MapStyle } from "@maptiler/leaflet-maptilersdk"

const [routes, services, stops]: [routes, services, stops] = await Promise.all([
  fetch("https://data.busrouter.sg/v1/routes.min.geojson").then(res => res.json()),
  fetch("https://data.busrouter.sg/v1/services.min.json").then(res => res.json()),
  fetch("https://data.busrouter.sg/v1/stops.min.geojson").then(res => res.json())
])

const startindex = Math.floor(Math.random() * stops.features.length)
const endindex = Math.floor(Math.random() * stops.features.length)

const startbusstop: fullbusstop = {
  number: stops.features[startindex].id,
  location: stops.features[startindex].geometry.coordinates,
  name: stops.features[startindex].properties.name,
  services: stops.features[startindex].properties.services,
  road: stops.features[startindex].properties.road
}
const endbusstop: fullbusstop = {
  number: stops.features[endindex].id,
  location: stops.features[endindex].geometry.coordinates,
  name: stops.features[endindex].properties.name,
  services: stops.features[endindex].properties.services,
  road: stops.features[endindex].properties.road
}

const hasbusstopbeenreached = { start: false, end: false }

const hasrepeatbuses = startbusstop.services.some(r => endbusstop.services.includes(r))
if (hasrepeatbuses) location.reload()

const map = L.map("map").setView([1.3521, 103.8198], 12)
maptilerLayer({
  apiKey: "iBKpu3YshpPXQzg7ZH1Y",
  style: MapStyle.OPENSTREETMAP,
}).addTo(map)

const startMarker = L.circleMarker([startbusstop.location[1], startbusstop.location[0]], { color: "red" }).addTo(map)
const endMarker = L.circleMarker([endbusstop.location[1], endbusstop.location[0]], { color: "red" }).addTo(map)

startMarker.bindPopup(`<div>${startbusstop.name}<br><button>${startbusstop.services.join("</button><button>")}</button></div>`)
endMarker.bindPopup(`<div>${endbusstop.name}<br><button>${endbusstop.services.join("</button><button>")}</button></div>`)

let routeonmap: L.Polyline
let busnum: string
const twopointsonmap: [pointstocrop?, pointstocrop?] = []
const routeshowntouser: string[] = []
const allowedmarkers = [startMarker, endMarker]

startMarker.on("popupopen", attachButtonListeners)
endMarker.on("popupopen", attachButtonListeners)

const dialog = document.querySelector("dialog") as HTMLDialogElement
const span = document.getElementById("route") as HTMLSpanElement

function attachButtonListeners(marker: L.PopupEvent) {
  if (busnum) {
    const busroutepoints: line = routes.features.find(f => f.properties.number == busnum)!.geometry.coordinates
    const busstopcoords: point = [marker.target.getLatLng().lng, marker.target.getLatLng().lat]
    twopointsonmap[1] = closestPointOnPolyline(busstopcoords, busroutepoints)
    const newlnglats = (twopointsonmap[0]?.lineindex! > twopointsonmap[1]?.lineindex)
    ? busroutepoints.slice(twopointsonmap[1]?.lineindex,twopointsonmap[0]?.lineindex)
    : busroutepoints.slice(twopointsonmap[0]?.lineindex,twopointsonmap[1]?.lineindex)
    routeonmap.setLatLngs(newlnglats.map(([lng, lat]) => [lat, lng]))
  }

  if (marker.target == startMarker) {
    endMarker.unbindPopup()
    hasbusstopbeenreached.start = true
    if (routeshowntouser.at(-1) != startbusstop.name) routeshowntouser.push(startbusstop.name)
  } else if (marker.target == endMarker) {
    startMarker.unbindPopup()
    hasbusstopbeenreached.end = true
    if (routeshowntouser.at(-1) != endbusstop.name) routeshowntouser.push(endbusstop.name)
  }

  document.querySelectorAll("button").forEach(button => {
    let triggeredByClick: boolean
    const color = `hsl(${Math.random() * 360},${Math.random() * 80 + 20}%,${Math.random() * 37.5 + 12.5}%)`

    button.addEventListener("mouseover", () => {
      routeonmap = L.polyline(getroutepath(button.textContent!), { color }).addTo(map)
      busnum = button.textContent!
      triggeredByClick = false
    })

    button.addEventListener("mouseout", () => {
      if (!triggeredByClick) map.removeLayer(routeonmap)
    })

    button.addEventListener("click", () => {
      let lastselected = ""

      const busroutepoints: line = routes.features
        .find(f => f.properties.number == button.textContent)!.geometry.coordinates
      const busstopcoords: point = [marker.target.getLatLng().lng, marker.target.getLatLng().lat]
      twopointsonmap[0] = closestPointOnPolyline(busstopcoords, busroutepoints)

      routeshowntouser.push(button.textContent!)
      const busroute = services[busnum].routes.flat()
      if (busroute.includes(endbusstop.number) && !hasbusstopbeenreached.end) {
        hasbusstopbeenreached.end = true
        routeshowntouser.push(endbusstop.name)
        lastselected = endbusstop.number
      }
      if (busroute.includes(startbusstop.number) && !hasbusstopbeenreached.start) {
        hasbusstopbeenreached.start = true
        routeshowntouser.push(startbusstop.name)
        lastselected = startbusstop.number
      }

      triggeredByClick = true

      if (hasbusstopbeenreached.start && hasbusstopbeenreached.end) {
        span.textContent = routeshowntouser.join(" → ")
        const busroutepoints: line = routes.features.find(f => f.properties.number == busnum)!.geometry.coordinates
        const busstopcoords: point = (lastselected == endbusstop.number) ? endbusstop.location : startbusstop.location
        twopointsonmap[1] = closestPointOnPolyline(busstopcoords, busroutepoints)
        const newlnglats = (twopointsonmap[0]?.lineindex! > twopointsonmap[1]?.lineindex)
        ? busroutepoints.slice(twopointsonmap[1]?.lineindex,twopointsonmap[0]?.lineindex)
        : busroutepoints.slice(twopointsonmap[0]?.lineindex,twopointsonmap[1]?.lineindex)
        routeonmap.setLatLngs(newlnglats.map(([lng, lat]) => [lat, lng]))
        dialog.showModal()
        return
      }

      const busroutes = services[button.textContent!].routes
      const busstops = busroutes[1] ? busroutes[0].concat(busroutes[1]) : busroutes[0]

      busstops.forEach(busstopnum => {
        if (busstopnum == startbusstop.number || busstopnum == endbusstop.number) return
        const filtered = stops.features.find(feat => feat.id == busstopnum)!
        const busstop = {
          name: filtered.properties.name,
          services: filtered.properties.services,
          location: filtered.geometry.coordinates
        }
        const busstopmarker = L.circleMarker([busstop.location[1], busstop.location[0]], { color }).addTo(map)
        busstopmarker.bindPopup(`<div>${busstop.name}<br><button>${busstop.services.join("</button><button>")}</button></div>`)
        busstopmarker.on("popupopen", attachButtonListeners)
        busstopmarker.on("popupopen", e => {
          if (routeshowntouser.at(-1) != busstop.name) routeshowntouser.push(busstop.name)
          allowedmarkers.push(e.target)
          cleanupMarkers(e.target)
        })
      })

      map.closePopup()
    })
  })
}

function cleanupMarkers(target?: L.Layer) {
  map.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && !allowedmarkers.includes(layer)) map.removeLayer(layer)
    if (layer != target) layer.unbindPopup()
  })
}

function getroutepath(num: string): line {
  return routes.features
    .filter(f => f.properties.number == num)
    .flatMap(f => f.geometry.coordinates)
    .map(([lng, lat]) => [lat, lng]) // flip for Leaflet display
}

function closestPointOnPolyline(p: point, polyline: line) {
  let bestPoint = polyline[0]
  let bestDist = Infinity
  let bestIndex = 0
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]
    const b = polyline[i + 1]
    const q = closestPointOnSegment(p, a, b)
    const d = distance(p, q)
    if (d < bestDist) {
      bestDist = d
      bestPoint = q
      bestIndex = i
    }
  }
  return { point: bestPoint, lineindex: bestIndex }
}

function closestPointOnSegment(p: point, a: point, b: point): point {
  const [ax, ay] = a
  const [bx, by] = b
  const [px, py] = p
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 == 0) return a
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  if (t < 0) t = 0
  if (t > 1) t = 1
  return [ax + t * dx, ay + t * dy]
}

function distance(a: point, b: point) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return Math.sqrt(dx * dx + dy * dy)
}