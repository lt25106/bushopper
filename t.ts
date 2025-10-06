const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
if (!mobile) window.location.href = "https://mapbushopper.netlify.app"

import L from "leaflet"

type point = [number, number]
type line = point[]
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

const [routes, services, stops]: [routes,services,stops] = await Promise.all([
  fetch("https://data.busrouter.sg/v1/routes.min.geojson").then(res => res.json()),
  fetch("https://data.busrouter.sg/v1/services.min.json").then(res => res.json()),
  fetch("https://data.busrouter.sg/v1/stops.min.geojson").then(res => res.json())
])
  
const map = L.map('map').setView([1.3521, 103.8198], 10)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

const startindex = Math.floor(Math.random() * stops["features"].length)
const endindex = Math.floor(Math.random() * stops["features"].length)
const footer = document.querySelector("footer")!
let routeshowntouser = ""

if (stops.features[startindex].properties.services.some(
  r => stops.features[endindex].properties.services.includes(r)
)) location.reload()

const startmarker = L.circleMarker([
  stops.features[startindex].geometry.coordinates[1],
  stops.features[startindex].geometry.coordinates[0]
],{color: "red"}).addTo(map).on("click", e => {
  footer.innerHTML = `
  <h2>${stops.features[startindex].properties.name}</h2>
  <button>${stops.features[startindex].properties.services.join("</button><button>")}</button>
  `
  routeshowntouser += stops.features[startindex].properties.name
  busstopreached.start = true
  renderfooter()
})

const endmarker = L.circleMarker([
  stops.features[endindex].geometry.coordinates[1],
  stops.features[endindex].geometry.coordinates[0]
],{color: "red"}).addTo(map).on("click", e => {
  footer.innerHTML = `
  <h2>${stops.features[endindex].properties.name}</h2>
  <button>${stops.features[endindex].properties.services.join("</button><button>")}</button>
  `
  routeshowntouser += stops.features[endindex].properties.name
  busstopreached.end = true
  renderfooter()
})

const allowedmarkers = [startmarker,endmarker]
const allowedbusroutes: L.GeoJSON[] = []
const busstopreached = {
  start: false,
  end: false
}

const dialog = document.querySelector("dialog")!

function renderfooter() {
  let currentbusnum = ""
  const color = `hsl(${Math.random() * 360},${Math.random() * 80 + 20}%,${Math.random() * 37.5 + 12.5}%)`
  footer.querySelectorAll("button").forEach(button => {button.addEventListener("click", () => {
    currentbusnum = button.textContent
    map.eachLayer(layer => {
      if (layer instanceof L.GeoJSON && !allowedbusroutes.includes(layer)) map.removeLayer(layer)
    })
    L.geoJSON(
      routes.features.find(
        feature => feature.properties.number == button.textContent
      )?.geometry, {style: {color}}
    ).addTo(map)
    if (footer.getElementsByClassName("confirm")[0]) return
    const confirmbutton = document.createElement("button")
    confirmbutton.classList.add("confirm")
    confirmbutton.textContent = "Confirm"
    footer.appendChild(document.createElement("br"))
    footer.appendChild(confirmbutton)

    confirmbutton.addEventListener("click",e => {
      routeshowntouser += " → " + currentbusnum
      map.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) allowedbusroutes.push(layer)
      })
      services[currentbusnum].routes.flat().forEach(busstopnumber => {
        if (busstopnumber == stops.features[startindex].id && !routeshowntouser.includes(stops.features[startindex].properties.name)) {
          busstopreached.start = true
          routeshowntouser += " → " + stops.features[startindex].properties.name
        }
        if (busstopnumber == stops.features[endindex].id && !routeshowntouser.includes(stops.features[endindex].properties.name)) {
          busstopreached.end = true
          routeshowntouser += " → " + stops.features[endindex].properties.name
        }
        if (busstopreached.start && busstopreached.end) {
          dialog.querySelector("span")!.textContent = routeshowntouser
          dialog.showModal()
          return
        }
        const busstop = stops.features.find(feature => feature.id == busstopnumber)!
        L.circleMarker([
          busstop.geometry.coordinates[1],
          busstop.geometry.coordinates[0]
        ], {color}).addTo(map).on("click", e => {
          routeshowntouser += " → " + busstop.properties.name
          footer.innerHTML = `
          <h2>${busstop.properties.name}</h2>
          <button>${busstop.properties.services.join("</button><button>")}</button>
          `
          allowedmarkers.push(e.target)
          renderfooter()
          map.eachLayer(layer => {
            if (layer instanceof L.CircleMarker && !allowedmarkers.includes(layer)) map.removeLayer(layer)
          })
        })
        
      })
      footer.style.bottom = "-50vh"
      setTimeout(() => {footer.textContent = ""}, 30)
      startmarker.off("click")
      endmarker.off("click")
    })
  })})
  footer.style.bottom = "0"
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}