const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
if (mobile) window.location.href = "https://mobilebushopper.netlify.app"

import L from "leaflet"
import { maptilerLayer, MapStyle } from "@maptiler/leaflet-maptilersdk"

// npm run build
type point = [number, number]
type line = point[]
type fullbusstop = {
  number: string,
  location: point,
  name: string,
  services: string[],
  road: string
}
type routes = {
  type: "FeatureCollection",
  features: {
    type: "Feature",
    properties: {
      number: string,
      pattern: number
    },
    geometry: {
      type: "LineString",
      coordinates: line
    }
  }[]
}
type services = {
  [servicenumber: string]: {
    name: string,
    routes: string[][]
  }
}
type stops = {
  type: "FeatureCollection",
  features: {
    type: "Feature",
    id: string,
    properties: {
      number: string,
      name: string,
      road: string,
      services: string[]
    },
    geometry: {
      type: "Point",
      coordinates: point
    }
  }[]
}
type Acc = { point: [number, number]; d: number }

const [routes, services, stops]: [routes,services,stops] = await Promise.all([
  fetch("https://data.busrouter.sg/v1/routes.min.geojson").then(res => res.json()),
  fetch("https://data.busrouter.sg/v1/services.min.json").then(res => res.json()),
  fetch("https://data.busrouter.sg/v1/stops.min.geojson").then(res => res.json())
])


const startindex = Math.floor(Math.random() * stops["features"].length)
const endindex = Math.floor(Math.random() * stops["features"].length)

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

const hasbusstopbeenreached = {start: false,end: false}

const hasrepeatbuses = startbusstop.services.some(r => endbusstop.services.includes(r))
if (hasrepeatbuses) location.reload()
  
const map = L.map('map').setView([1.3521, 103.8198], 12)
maptilerLayer({
  apiKey: "iBKpu3YshpPXQzg7ZH1Y",
  style: MapStyle.OPENSTREETMAP
}).addTo(map)
const startMarker = L.circleMarker([startbusstop.location[1], startbusstop.location[0]], { color: "red" }).addTo(map)
const endMarker = L.circleMarker([endbusstop.location[1], endbusstop.location[0]], { color: "red" }).addTo(map)

startMarker.bindPopup(`<div>${startbusstop.name}<br><button>${startbusstop.services.join("</button><button>")}</button></div>`)
endMarker.bindPopup(`<div>${endbusstop.name}<br><button>${endbusstop.services.join("</button><button>")}</button></div>`)

let routeonmap: L.Polyline
let busnum: string
const routeshowntouser: string[] = []
const allowedmarkers = [startMarker, endMarker]

startMarker.on("popupopen", attachButtonListeners)
endMarker.on("popupopen", attachButtonListeners)

const dialog = document.querySelector("dialog") as HTMLDialogElement
const span = dialog.querySelector("span:not(#copied)") as HTMLSpanElement

function attachButtonListeners(marker: L.PopupEvent) {
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
    const color = `hsl(${Math.random() * 360},${Math.random() * 80 + 20}%,${Math.random() * 77.5 + 12.5}%)`
    
    button.addEventListener("mouseover", () => {
      routeonmap = L.polyline(getroutepath(button.textContent), { color }).addTo(map)
      busnum = button.textContent
      triggeredByClick = false
    })
    
    button.addEventListener("mouseout", () => {
      if (!triggeredByClick) map.removeLayer(routeonmap)
    })
    
    button.addEventListener("click", () => {
      const route = routes.features.find(feature => feature.properties.number == button.textContent)!
      
      const busstopcoords = stops.features.find(feature => feature.properties.name == button.parentElement?.innerHTML.split("<")[0])!.geometry.coordinates
      const routecoords = route.geometry.coordinates
      const pointonline = route.geometry.coordinates[closestPointOnPolyline(busstopcoords,routecoords).index]
      // console.log(closestPointOnPolyline(busstopcoords,routecoords))
      routeshowntouser.push(button.textContent)
      const busroute = services[busnum].routes.flat()
      if (busroute.includes(endbusstop.number) && !hasbusstopbeenreached.end) {
        hasbusstopbeenreached.end = true
        routeshowntouser.push(endbusstop.name)
      }
      if (busroute.includes(startbusstop.number) && !hasbusstopbeenreached.start) {
        hasbusstopbeenreached.start = true
        routeshowntouser.push(startbusstop.name)
      }
      if (hasbusstopbeenreached.start && hasbusstopbeenreached.end) {
        span.textContent = routeshowntouser.join(" → ")
        dialog.showModal()
      }
      triggeredByClick = true
      const busroutes = services[button.textContent].routes
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
          // console.log(closestPointOnPolyline(busstop.location,routecoords))
          if (routeshowntouser.at(-1) != busstop.name) routeshowntouser.push(busstop.name)
          allowedmarkers.push(e.target)
          cleanupMarkers(e.target)
        })
      })
      
      map.closePopup()
    })
  })
} 

function cleanupMarkers(target: any) {
  map.eachLayer(layer => {
    if (layer instanceof L.CircleMarker && !allowedmarkers.includes(layer)) map.removeLayer(layer)
    if (layer != target) layer.unbindPopup()
  })
}

function getroutepath(num: string): line {
  return <line>(routes.features.filter(f => f.properties.number == num).flatMap(f => f.geometry.coordinates).map(([lng, lat]) => [lat, lng]))
}

function closestPointOnPolyline(point: [number, number], polyline: [number, number][]) {
  const [px, py] = point

  let closest = { point: [0, 0] as [number, number], distance: Infinity, segmentIndex: -1 }

  for (let i = 0; i < polyline.length - 1; i++) {
    const [x1, y1] = polyline[i]
    const [x2, y2] = polyline[i + 1]

    let closestX: number
    let closestY: number

    if (x1 == x2) {
      closestX = x1
      closestY = py
    } else if (y1 == y2) {
      closestX = px
      closestY = y1
    } else {
      const slope = (y2 - y1) / (x2 - x1)
      closestX = (slope * slope * (py - y1) + slope * slope * slope * x1 + px) / (slope * slope + 1)
      closestY = slope * closestX + y1 - slope * x1
    }

    const dx = px - closestX
    const dy = py - closestY
    const distSq = dx * dx + dy * dy

    if (distSq < closest.distance) {
      closest = { point: [closestX, closestY], distance: distSq, segmentIndex: i }
    }
  }

  return { point: closest.point, index: closest.segmentIndex }
}