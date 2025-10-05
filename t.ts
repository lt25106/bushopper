const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
if (!mobile) window.location.href = "https://mapbushopper.netlify.app"

import L from "leaflet"

type point = [number, number]
type line = point[]
type fullbusstop = {
  number: string,
  location: point,
  name: string,
  services: string[],
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

const [routes, services, stops]: [routes,services,stops] = await Promise.all([
  fetch("https://data.busrouter.sg/v1/routes.min.geojson").then(res => res.json()),
  fetch("https://data.busrouter.sg/v1/services.min.json").then(res => res.json()),
  fetch("https://data.busrouter.sg/v1/stops.min.geojson").then(res => res.json())
])

// function busstop(index: number) {
//   return {
//     number: stops.features[index].id,
//     location: stops.features[index].geometry.coordinates,
//     name: stops.features[index].properties.name,
//     services: stops.features[index].properties.services,
//   }
// }

// const startbusstop = busstop(startindex)
// const endbusstop = busstop(endindex)
// const hasbusstopbeenreached = {start: false,end: false}

// const hasrepeatbuses = startbusstop.services.some(r => endbusstop.services.includes(r))
// if (hasrepeatbuses) location.reload()
  
const map = L.map('map').setView([1.3521, 103.8198], 10)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

const startindex = Math.floor(Math.random() * stops["features"].length)
const endindex = Math.floor(Math.random() * stops["features"].length)
const footer = document.querySelector("footer")!

const startmarker = L.circleMarker([
  stops.features[startindex].geometry.coordinates[1],
  stops.features[startindex].geometry.coordinates[0]
],{color: "red"}).addTo(map).on("click", e => {
  footer.innerHTML = `
  <h2>${stops.features[startindex].properties.name}</h2>
  <button>${stops.features[startindex].properties.services.join("</button><button>")}</button>
  `
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
  renderfooter()
})

function renderfooter() {
  let currentbusnum = ""
  const color = `hsl(${Math.random() * 360},${Math.random() * 80 + 20}%,${Math.random() * 37.5 + 12.5}%)`
  footer.querySelectorAll("button").forEach(button => {button.addEventListener("click", () => {
    currentbusnum = button.textContent
    map.eachLayer(layer => {
      if (layer instanceof L.GeoJSON) map.removeLayer(layer)
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
      services[currentbusnum].routes.flat().forEach(busstopnumber => {
        L.circleMarker([
          stops.features.find(feature => feature.id == busstopnumber)!.geometry.coordinates[1],
          stops.features.find(feature => feature.id == busstopnumber)!.geometry.coordinates[0]
        ], {color}).addTo(map)
      })
      footer.style.bottom = `-${footer.scrollHeight}px`
      startmarker.off("click")
      endmarker.off("click")
    })
  })})
  footer.style.bottom = "0"
}