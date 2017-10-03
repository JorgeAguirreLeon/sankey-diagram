const input = {
  viewbox: {
    width: 1500,
    height: 900
  },
  data: [
    ['lead','lead','perdido'],
    ['prueba','lead_q','alumno'],
    ['prueba','lead_q','perdido'],
    ['lead','prueba','lead_q','alumno'],
    ['lead','lead','lead','lead','prueba','alumno']
  ],
  colors: ['#1f77b4', '#ff7f0e', '#9467bd', '#2ca02c', '#d62728'],
  keys: ['lead', 'prueba', 'lead_q', 'alumno', 'perdido'],
  proportions: {
    vertical: .9,
    horizontal: .65
  }
}

const svg_id = 'main'

render_sankey(svg_id, input)
