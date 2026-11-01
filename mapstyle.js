/* سند جايك — نمط خريطة مستوحى من ويز (Waze): ألوان مرحة، طرق عريضة واضحة، تسميات عربية.
 * يستخدم بلاطات OpenFreeMap المجانية (مخطط OpenMapTiles).
 */
(function () {
  'use strict';
  const F = (window.F = window.F || {});

  const PAL = {
    light: {
      bg: '#EAEFF3', water: '#9ED3F3', grass: '#D3E8C6', park: '#C9E4BA', sand: '#F1E9D2', built: '#E1E7EC', industrial: '#DCE0E6',
      building: '#D9DFE5', buildingLine: '#CBD3DA',
      casing: '#B9C3CD', minor: '#FFFFFF', mid: '#FFFFFF', major: '#FFF1BE', majorCase: '#E6C766', hw: '#FFD76A', hwCase: '#E0A92B',
      rail: '#B5BDC6', boundary: '#A9B4BF',
      text: '#3C4753', halo: '#FFFFFF', placeText: '#27303A', waterText: '#4B86AA'
    },
    dark: {
      bg: '#1B2430', water: '#12405F', grass: '#1D3A34', park: '#1F4038', sand: '#2B2F33', built: '#202B38', industrial: '#232C37',
      building: '#26323F', buildingLine: '#2E3C4B',
      casing: '#0D131A', minor: '#3B485A', mid: '#46556A', major: '#5A6C85', majorCase: '#0D131A', hw: '#FF9A55', hwCase: '#8A3F12',
      rail: '#3A4655', boundary: '#4A5A6C',
      text: '#AEBBCA', halo: '#1B2430', placeText: '#E6EDF5', waterText: '#6FA8CC'
    }
  };

  const z = (stops) => ['interpolate', ['exponential', 1.4], ['zoom']].concat([].concat.apply([], stops));
  const cls = (list) => ['match', ['get', 'class'], list, true, false];

  F.wazeStyle = function (theme) {
    const c = PAL[theme === 'light' ? 'light' : 'dark'];
    const road = (id, filter, color, widths, extra) => Object.assign({
      id: id, type: 'line', source: 'omt', 'source-layer': 'transportation', filter: filter,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': color, 'line-width': z(widths) }
    }, extra || {});
    const notTunnel = ['!=', ['get', 'brunnel'], 'tunnel'];
    const isLine = ['==', ['geometry-type'], 'LineString'];

    const sets = [
      ['minor', ['all', isLine, cls(['minor', 'service', 'track'])], c.minor, [[12, 0.6], [15, 3], [18, 14]], c.casing, [[13, 1.2], [15, 4.5], [18, 17]], 12],
      ['mid', ['all', isLine, cls(['tertiary', 'secondary'])], c.mid, [[10, 0.8], [14, 4], [18, 20]], c.casing, [[10, 1.6], [14, 6], [18, 24]], 8],
      ['major', ['all', isLine, cls(['primary'])], c.major, [[8, 0.8], [14, 5], [18, 24]], c.majorCase, [[8, 1.6], [14, 7.5], [18, 28]], 6],
      ['hw', ['all', isLine, cls(['motorway', 'trunk'])], c.hw, [[5, 0.8], [10, 2.2], [14, 6], [18, 26]], c.hwCase, [[5, 1.6], [10, 3.6], [14, 8.5], [18, 31]], 4]
    ];

    const layers = [
      { id: 'bg', type: 'background', paint: { 'background-color': c.bg } },
      { id: 'landcover-grass', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: cls(['grass', 'wood', 'farmland']), paint: { 'fill-color': c.grass } },
      { id: 'landcover-sand', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: cls(['sand']), paint: { 'fill-color': c.sand } },
      { id: 'landuse-built', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: cls(['residential', 'suburb', 'neighbourhood', 'commercial', 'retail']), paint: { 'fill-color': c.built } },
      { id: 'landuse-industrial', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: cls(['industrial', 'quarry', 'railway']), paint: { 'fill-color': c.industrial } },
      { id: 'landuse-green', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: cls(['cemetery', 'pitch', 'playground', 'stadium']), paint: { 'fill-color': c.grass } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': c.park } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': c.water } },
      { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': c.water, 'line-width': z([[8, 0.6], [14, 3], [18, 8]]) } },
      { id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': c.building, 'fill-outline-color': c.buildingLine } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['all', isLine, cls(['rail'])], minzoom: 11, paint: { 'line-color': c.rail, 'line-width': 1.2, 'line-dasharray': [3, 3] } }
    ];
    // الطرق: الغلاف أولاً لكل الفئات ثم التعبئة (حتى تتقاطع بشكل نظيف)
    sets.slice().reverse().forEach((s) => layers.push(road('casing-' + s[0], s[1], s[4], s[5], { minzoom: s[6], filter: ['all', s[1], notTunnel] })));
    sets.forEach((s) => layers.push(road('road-' + s[0], s[1], s[2], s[3], { minzoom: s[6] })));
    layers.push(
      { id: 'boundary', type: 'line', source: 'omt', 'source-layer': 'boundary', filter: ['<=', ['get', 'admin_level'], 4], paint: { 'line-color': c.boundary, 'line-width': 1, 'line-dasharray': [4, 3] } },
      {
        id: 'road-label', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 13,
        layout: { 'symbol-placement': 'line', 'text-field': ['coalesce', ['get', 'name:ar'], ['get', 'name']], 'text-font': ['Noto Sans Bold'], 'text-size': z([[13, 11], [18, 15]]), 'text-letter-spacing': 0 },
        paint: { 'text-color': c.text, 'text-halo-color': c.halo, 'text-halo-width': 2.2 }
      },
      {
        id: 'water-label', type: 'symbol', source: 'omt', 'source-layer': 'water_name',
        layout: { 'text-field': ['coalesce', ['get', 'name:ar'], ['get', 'name']], 'text-font': ['Noto Sans Regular'], 'text-size': 12.5 },
        paint: { 'text-color': c.waterText, 'text-halo-color': c.halo, 'text-halo-width': 1.2 }
      },
      {
        id: 'place-label', type: 'symbol', source: 'omt', 'source-layer': 'place', filter: cls(['city', 'town', 'village', 'suburb', 'neighbourhood', 'quarter']),
        layout: {
          'text-field': ['coalesce', ['get', 'name:ar'], ['get', 'name']], 'text-font': ['Noto Sans Bold'],
          'text-size': ['match', ['get', 'class'], 'city', 19, 'town', 16, 'village', 14, 12.5], 'text-max-width': 8
        },
        paint: { 'text-color': c.placeText, 'text-halo-color': c.halo, 'text-halo-width': 1.8 }
      }
    );

    return {
      version: 8,
      name: 'sanad-waze-' + theme,
      glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
      sources: { omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
      layers: layers
    };
  };
})();
