/// <reference types="leaflet" />

// esbuild t.ts --minify --outfile=j.js
type point = [number, number]
type line = point[]
type busstop = {
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

async function main() {
  const routes: routes = await fetch("https://data.busrouter.sg/v1/routes.geojson").then(res => res.json())
  const services: services = await fetch("https://data.busrouter.sg/v1/services.json").then(res => res.json())
  const stops: stops = await fetch("https://data.busrouter.sg/v1/stops.geojson").then(res => res.json())

  // console.log(routes)   // routes data
  // console.log(services) // services data
  // console.log(stops)    // stops data

  const startindex = Math.floor(Math.random() * stops["features"].length)
  const endindex = Math.floor(Math.random() * stops["features"].length)

  const startbusstop: busstop = {
    number: stops.features[startindex].id,
    location: stops.features[startindex].geometry.coordinates,
    name: stops.features[startindex].properties.name,
    services: stops.features[startindex].properties.services,
    road: stops.features[endindex].properties.road
  }
  const endbusstop: busstop = {
    number: stops.features[endindex].id,
    location: stops.features[endindex].geometry.coordinates,
    name: stops.features[endindex].properties.name,
    services: stops.features[endindex].properties.services,
    road: stops.features[endindex].properties.road
  }

  // console.log(startbusstop)
  // console.log(endbusstop)

  const repeatbuses = startbusstop.services.some(r => endbusstop.services.includes(r))
  if (repeatbuses) location.reload()

  const map = L.map('map').setView([1.3521, 103.8198], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
  const startMarker = L.circleMarker([startbusstop.location[1], startbusstop.location[0]], { color: "red" }).addTo(map)
  const endMarker = L.circleMarker([endbusstop.location[1], endbusstop.location[0]], { color: "red" }).addTo(map)

  startMarker.bindPopup(`<div>${startbusstop.name}<br>${showbuses(startbusstop.services)}</div>`)
  endMarker.bindPopup(`<div>${endbusstop.name}<br>${showbuses(endbusstop.services)}</div>`)

  let routepath: L.GeoJSON
  let allowedmarkers = [startMarker, endMarker]

  startMarker.on("popupopen", attachButtonListeners)
  endMarker.on("popupopen", attachButtonListeners)

  function attachButtonListeners() {
    const buttons = document.querySelectorAll("button")

    buttons.forEach(button => {
      let triggeredbyclick: boolean
      const color = `hsl(${Math.random() * 360},100%,50%)`
      button.addEventListener("mouseover", () => {
        routepath = L.geoJSON(getroutepath(button.textContent), { style: { color: color } }).addTo(map)
        triggeredbyclick = false
      })
      button.addEventListener("mouseout", () => {
        if (!triggeredbyclick) map.removeLayer(routepath)
      })
      button.addEventListener("click", () => {
        triggeredbyclick = true

        const busstops = services[button.textContent].routes[1]
          ? services[button.textContent].routes[0].concat(services[button.textContent].routes[1])
          : services[button.textContent].routes[0]

        busstops.forEach((busstopnum: string) => {
          if (busstopnum != startbusstop.number && busstopnum != endbusstop.number) {
            const busstop = {
              name: stops.features.filter(feat => feat.id == busstopnum)[0].properties.name,
              services: stops.features.filter(feat => feat.id == busstopnum)[0].properties.services,
              location: stops.features.filter(feat => feat.id == busstopnum)[0].geometry.coordinates
            }
            const busstopmarker = L.circleMarker([busstop.location[1], busstop.location[0]], { color: color }).addTo(map)
            busstopmarker.bindPopup(`${busstop.name}<br>${showbuses(busstop.services)}</div>`)
            busstopmarker.on("popopen", attachButtonListeners)
            busstopmarker.on("popupopen", e => {
              allowedmarkers.push(e.target)
              map.eachLayer(layer => {
                if (layer instanceof L.CircleMarker && !allowedmarkers.includes(layer)) map.removeLayer(layer)
                if (layer != e.target) layer.unbindPopup()
              })

              // const busroute = (
              //   (routepath.toGeoJSON() as GeoJSON.FeatureCollection).features[0].geometry as GeoJSON.MultiLineString
              // ).coordinates
              // const markercoords: [number, number] = [e.target.getLatLng().lng, e.target.getLatLng().lat]
              // const stopclosestPointOnLine = closestPointOnLine(busroute.flat() as [number, number][], markercoords)
              // const startclosestPointOnLine = closestPointOnLine(
              //   busroute.flat() as [number, number][],
              //   startbusstop.location
              // )
              // const newroute = busroute[startclosestPointOnLine.segmentIndex]
              // console.log(newroute)

            }) // end of popupopen
          } // end of if
        }) // end of foreach
        map.closePopup()
      }) // end of eventlistener
    }) // end of foreach
  } // end of function

  function getroutepath(num: string) {
    const matches = routes.features.filter(feat => feat.properties.number == num)
    if (matches.length == 0) return

    const multiCoords = matches.map(feat => feat.geometry.coordinates)

    return {
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: multiCoords
      },
      properties: {}
    } as GeoJSON.Feature
  }
}

function showbuses(array: string[]) {
  let result = ""
  array.forEach(bus => {
    result += `<button>${bus}</button>`
  })
  return result
}

function closestPointOnLine(line: line, point: point) {
  let closest
  let minDist = Infinity
  let segmentIndex = -1

  for (let i = 0; i < line.length - 1; i++) {
    const [x1, y1] = line[i]
    const [x2, y2] = line[i + 1]
    const [px, py] = point

    const vx = x2 - x1
    const vy = y2 - y1
    const wx = px - x1
    const wy = py - y1

    let t = (wx * vx + wy * vy) / (vx * vx + vy * vy)
    if (t < 0) t = 0
    else if (t > 1) t = 1

    const cx = x1 + t * vx
    const cy = y1 + t * vy

    const dx = px - cx
    const dy = py - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < minDist) {
      minDist = dist
      closest = [cx, cy]
      segmentIndex = i
    }
  }

  return { point: closest, segmentIndex }
}

main()