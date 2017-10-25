import React, { Component } from 'react'
import './App.css'

class App extends Component {

  renderDivisionBlocks = (index, total_divisions, total_leads, iteration_leads, viewbox, distribution, colors, proportions)=> {

    let height_offset = (total_leads - iteration_leads)/total_leads*viewbox.height/2

    return Object.keys(distribution).filter(key=> distribution[key] > 0).map((key, i)=> {
      const block_height = distribution[key]/total_leads*viewbox.height
      const block_width = viewbox.width/total_divisions * proportions.horizontal
      const path = (
        <path
          key={i}
          d={`M 0 ${height_offset} h ${block_width} v ${block_height*proportions.vertical} h -${block_width} Z`}
          fill={colors[i%colors.length]}
        />
      )
      height_offset += block_height
      return path
    })
  }

  renderDivisionTransitions = (index, total_divisions, total_leads, next_distribution_offset, block_height_offset, data, keys, viewbox, distribution, proportions)=> {
    return keys.filter(key=> distribution[key] > 0).map((key, internal_index)=> {
      // Get the box's dimensions
      const block_height = distribution[key]/total_leads*viewbox.height
      const block_width = viewbox.width/total_divisions * proportions.horizontal
      /*
       * Also get the segment offset. It's the inner offset for the connection path.
       * Say a block has 5 elements and measures 5. Initially the segment offset would
       * be 0. After creating a path connecting the first 2 elements to the next transition
       * this value should update to 2, so the next path starts at y=2 and does not overlap
       */
      let segment_height_offset = 0
      const connecting_paths = keys.map((next_key, i)=> {
        const total_transition = data.filter(d=> (d.length > index+1) && d[index]===key && d[index+1]===next_key).length
        if (total_transition === 0) return null
        // We calculate the segment height with the number of elements transitioning from key to next_key
        const segment_height = total_transition / total_leads * viewbox.height * proportions.vertical
        // Create a <path> connecting the segments (part of the block). We've opted for somewhat complex math for a smooth curve

        const render_d = ()=> {
          const start_x = block_width
          const end_x = (1/proportions.horizontal)*block_width
          const curve_1_x = ((5/proportions.horizontal + proportions.horizontal)/6)*block_width
          const curve_2_x = ((1/proportions.horizontal+proportions.horizontal)/2)*block_width
          const start_y = block_height_offset+segment_height_offset
          const end_y = next_distribution_offset[next_key].height_offset + next_distribution_offset[next_key].segment_offset
          const curve_1_y = start_y
          const curve_2_y = end_y
          return `M ${start_x} ${start_y} C ${curve_1_x} ${curve_1_y} ${curve_2_x} ${curve_2_y} ${end_x} ${end_y} v ${segment_height} C ${curve_2_x} ${curve_2_y+segment_height} ${curve_1_x} ${curve_1_y+segment_height} ${start_x} ${start_y+segment_height} Z`
        }

        const path = (
          <path
            key={`${index}-${internal_index}-${i}`}
            className='transition-path'
            d={render_d()}
            dataorigin={key}
            datadestiny={next_key}
          />
        )

        // Update offset data (both for the division-n block and division-(n+1))
        segment_height_offset += segment_height
        next_distribution_offset[next_key].segment_offset += segment_height

        return path
      })
      /*
       * After we've done all transitions from key to all next-keys, we update our own offset
       * so the connecting path starts on the next block
       */
      block_height_offset += block_height

      return (
        <g key={`${index}-${internal_index}`} className='connected-segments'>
          {connecting_paths}
        </g>
      )
    })
  }

  render() {

    const {viewbox, data, colors, keys, proportions} = this.props

    const SANKEY_DIVISIONS = data.reduce((target, current)=> target = Math.max(target, current.length), 1)
    const TOTAL_DATA_AMOUNT = data.length

    return (
      <div className='App'>
        <svg id='main' viewBox={`0 0 ${viewbox.width} ${viewbox.height}`}>
          <g className='content'>
            {[...Array(SANKEY_DIVISIONS)].map((key, index)=> {
              // Current
              let distribution = keys.reduce((target, current)=>Object.assign(target, {[current]:0}), {})
              data.filter(d=> d.length > index).forEach(d=> distribution[d[index]]++)
              // Get the lead total for this distribution
              const DIVISION_TOTAL_LEADS = keys.reduce((total, current)=>total+=distribution[current], 0)
              // Next
              let next_distribution = keys.reduce((target, current)=>Object.assign(target, {[current]:0}), {})
              data.filter(d=> d.length > index+1).forEach(d=> next_distribution[d[index+1]]++)
              // Next
              let next_distribution_offset = keys.reduce((target, current)=>Object.assign(target, {[current]:{height_offset: 0, segment_offset: 0}}), {})
              const DIVISION_NEXT_TOTAL_LEADS = keys.reduce((total, current)=>total+=next_distribution[current], 0)
              // Special calculation for next
              let next_height_offset = (TOTAL_DATA_AMOUNT - DIVISION_NEXT_TOTAL_LEADS)/TOTAL_DATA_AMOUNT*viewbox.height/2
              keys.filter(key=> next_distribution[key] > 0).forEach(key=> {
                next_distribution_offset[key].height_offset = next_height_offset
                next_height_offset += next_distribution[key]/TOTAL_DATA_AMOUNT*viewbox.height
              })
              //
              let block_height_offset = (TOTAL_DATA_AMOUNT - DIVISION_TOTAL_LEADS)/TOTAL_DATA_AMOUNT*viewbox.height/2
              // Actual render
              return (
                <g
                  key={index}
                  className={`contact-data contact--${index}`}
                  transform={`translate(${index*viewbox.width/SANKEY_DIVISIONS}, 0)`}
                >
                  {this.renderDivisionBlocks(index, SANKEY_DIVISIONS, TOTAL_DATA_AMOUNT, DIVISION_TOTAL_LEADS, viewbox, distribution, colors, proportions)}
                  {this.renderDivisionTransitions(index, SANKEY_DIVISIONS, TOTAL_DATA_AMOUNT, next_distribution_offset, block_height_offset, data, keys, viewbox, distribution, proportions)}
                </g>
              )
            }
          )}
          </g>
        </svg>
      </div>
    )
  }
}

export default App
