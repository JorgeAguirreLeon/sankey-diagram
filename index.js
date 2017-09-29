const width = 1500;
const height = 900;

const colors = ['#1f77b4', '#ff7f0e', '#9467bd', '#2ca02c', '#d62728']

const data = [
  ['lead','lead','perdido'],
  ['prueba','lead_q','alumno'],
  ['prueba','lead_q','perdido'],
  ['lead','prueba','lead_q','alumno'],
  ['lead','lead','lead','lead','prueba','alumno']
]

const keys = ['lead', 'prueba', 'lead_q', 'alumno', 'perdido']


const svg = d3.select('#main');
svg.attr('viewBox', `0 0 ${width} ${height}`)

const content = svg.append('g').classed('content', true)

const total_leads = data.length
const divisions = d3.max(data, d=>d.length)

for (let index=0; index<divisions; index++) {
  let distribution = keys.reduce((target, current)=>Object.assign(target, {[current]:0}), {})
  data.filter(lead=> lead.length > index).forEach(lead=> distribution[lead[index]]++)
  const division_total_leads = d3.sum(keys, d=>distribution[d])

  const division_container = content.append('g')
    .classed(`contact-data contact--${index}`, true)
    .attr('transform', `translate(${index*width/divisions}, ${0})`)
  let height_offset = (total_leads - division_total_leads)/total_leads*height/2
  keys.filter(type=> distribution[type] > 0).forEach(type=> {
    const block_height = distribution[type]/total_leads*height
    const block_width = width/divisions * .5
    division_container.append('path')
      .attr('d', `M 0 ${height_offset} h ${block_width} v ${block_height*.9} h -${block_width} Z`)
      .attr('fill', colors[keys.indexOf(type)])
    height_offset += block_height
  })

  // Transitions
  let next_distribution = keys.reduce((target, current)=>Object.assign(target, {[current]:0}), {})
  let next_distribution_offset = keys.reduce((target, current)=>Object.assign(target, {[current]:{height_offset: 0, segment_offset: 0}}), {})
  data.filter(lead=> lead.length > index+1).forEach(lead=> next_distribution[lead[index+1]]++)

  const next_division_total_leads = d3.sum(keys, d=>next_distribution[d])
  let next_height_offset = (total_leads - next_division_total_leads)/total_leads*height/2
  keys.filter(type=> next_distribution[type] > 0).forEach(type=> {
    next_distribution_offset[type].height_offset = next_height_offset
    next_height_offset += next_distribution[type]/total_leads*height
  })
  console.log(next_distribution_offset)

  let block_height_offset = (total_leads - division_total_leads)/total_leads*height/2
  keys.filter(type=> distribution[type] > 0).forEach(type=> {
    const block_height = distribution[type]/total_leads*height
    const block_width = width/divisions * .5
    let segment_height_offset = 0
    keys.forEach(next_type=> {
      const total_transition = data.filter(lead=> (lead.length > index+1) && lead[index]===type && lead[index+1]===next_type).length
      if (total_transition === 0) return
      const segment_height = total_transition / total_leads * height * .9

      division_container.append('path')
        .classed('transition-path', true)
        .attr('d', ()=> {
          const start_x = block_width
          const end_x = 2*block_width
          const curve_1_x = 1.75*block_width
          const curve_2_x = 1.25*block_width
          const start_y = block_height_offset+segment_height_offset
          const end_y = next_distribution_offset[next_type].height_offset + next_distribution_offset[next_type].segment_offset
          const curve_1_y = start_y
          const curve_2_y = end_y
          return `M ${start_x} ${start_y} C ${curve_1_x} ${curve_1_y} ${curve_2_x} ${curve_2_y} ${end_x} ${end_y} v ${segment_height} C ${curve_2_x} ${curve_2_y+segment_height} ${curve_1_x} ${curve_1_y+segment_height} ${start_x} ${start_y+segment_height} Z`
        })
        .attr('data-source', type)
        .attr('data-destiny', next_type)
      segment_height_offset += segment_height
      next_distribution_offset[next_type].segment_offset += segment_height
    })
    block_height_offset += block_height
  })

}
