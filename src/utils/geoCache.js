/**
 * geoCache.js — In-memory caching for GeoJSON land boundaries and dot matrix
 * Prevents re-fetching and expensive point-in-polygon recalculations on page transitions.
 */

import * as d3 from 'd3'

let cachedFeatures = null
let cachedDots = null
let loadPromise = null

export async function getLandData(dotSpacing = 16) {
  if (cachedFeatures && cachedDots) {
    return { features: cachedFeatures, dots: cachedDots }
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      let data = null
      try {
        const res = await fetch('/ne_110m_land.json')
        if (res.ok) data = await res.json()
      } catch {}

      if (!data) {
        const res = await fetch('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json')
        data = await res.json()
      }

      cachedFeatures = data

      // Pre-compute land dots
      const dots = []
      const step = dotSpacing * 0.08 // ~1.28 degrees

      data.features.forEach(f => {
        const geom = f.geometry
        if (!geom) return
        const polys = geom.type === 'Polygon' ? [geom.coordinates]
                    : geom.type === 'MultiPolygon' ? geom.coordinates : []

        polys.forEach(rings => {
          const outer = rings[0]
          if (!outer || outer.length < 3) return

          let minLng = Infinity, maxLng = -Infinity
          let minLat = Infinity, maxLat = -Infinity
          outer.forEach(([lng, lat]) => {
            if (lng < minLng) minLng = lng; if (lng > maxLng) maxLng = lng
            if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat
          })

          for (let lng = minLng; lng <= maxLng; lng += step) {
            for (let lat = minLat; lat <= maxLat; lat += step) {
              if (d3.geoContains({ type: 'Polygon', coordinates: rings }, [lng, lat])) {
                dots.push([lng, lat])
              }
            }
          }
        })
      })

      cachedDots = dots
      return { features: cachedFeatures, dots: cachedDots }
    })()
  }

  return loadPromise
}
