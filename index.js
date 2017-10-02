/*
 * svg_id -> Reference to a <svg> DOM node to render the data
 * data -> {
 *    viewbox: {width, height} -> Contains the viewbox dimensions
 *    data: [Array] -> An array of arrays with the state of each data entry in each state
 *    colors: Array -> List of colors to use for the diagram
 *    keys: Array -> List of keys found in the data. Will be mapped in an orderly fashion to colors
 *    proportions: { vertical, horizontal} -> Data indicating vertical and horizontal spacing with blocks
 * }
 */
function render_sankey(svg_id, {viewbox, data, colors, keys, proportions}) {

  // Fetch the SVG as indicated, and set its viewBox attribute.
  const svg = d3.select('#main')
  svg.attr('viewBox', `0 0 ${viewbox.width} ${viewbox.height}`)

  // Create a <g> with the content
  const content = svg
    .append('g')
    .classed('content', true)

  // A few useful data: divisions for the diagram and max. data per division
  const SANKEY_DIVISIONS = d3.max(data, d=>d.length)
  const TOTAL_DATA_AMOUNT = data.length

  /*
   * Block 1: This takes care of the data blocks. It renders each block
   * set in its respective division with the indicated color.
   */
  for (let index=0; index<SANKEY_DIVISIONS; index++) {
    // Create an object for the distribution with all the keys, assigned to 0
    let distribution = keys.reduce((target, current)=>Object.assign(target, {[current]:0}), {})
    /*
     * Filter out all the elements in the data array that aren't long enough
     * Then count them and store the result in the distribution array
     */
    data.filter(d=> d.length > index).forEach(d=> distribution[d[index]]++)

    // Also very relevant: Get the total leads for this distribution
    const DIVISION_TOTAL_LEADS = d3.sum(keys, d=>distribution[d])

    // The division container will be a <g> that will be x-translated so they dont overlap
    const division_container = content.append('g')
      .classed(`contact-data contact--${index}`, true)
      .attr('transform', `translate(${index*viewbox.width/SANKEY_DIVISIONS}, ${0})`)

    /*
     * The height offset indicates where to place the block
     * (y-axis, as the x-axis is already defined).
     * It starts at != 0 if the division has fewer data entries than total, since
     * we want to render the content vertically centered
     */
    let height_offset = (TOTAL_DATA_AMOUNT - DIVISION_TOTAL_LEADS)/TOTAL_DATA_AMOUNT*viewbox.height/2
    // We filter all the keys that have no data in this particular division to avoid rendering 0px <path>
    keys.filter(key=> distribution[key] > 0).forEach(key=> {

      // Get the block (<path>) dimensions from the given data and available space
      const block_height = distribution[key]/TOTAL_DATA_AMOUNT*viewbox.height
      const block_width = viewbox.width/SANKEY_DIVISIONS * proportions.horizontal

      // Create a new path (a very simple rectangle using the color as fill)
      division_container.append('path')
        .attr('d', `M 0 ${height_offset} h ${block_width} v ${block_height*proportions.vertical} h -${block_width} Z`)
        .attr('fill', colors[keys.indexOf(key)%colors.length])

      // Update the height_offset with this block's height to get the y-axis value for the next block
      height_offset += block_height
   })

   /*
    * Block 2: Transitions. It renders each curve connecting one sankey-diagram with
    * the next. It's assumed all go from division-n to division-(n+1) or end in
    * division-n.
    * A lot of work is very similar, but for the next distribution, since we need
    * the connecting lines to go from division-n to division-(n+1)
    */
    // As with distribution-n we obtain the data distribution by key
   let next_distribution = keys.reduce((target, current)=>Object.assign(target, {[current]:0}), {})
   /*
    * We are going to get 2 more values for each key:
    * 1) The height offset (indicating where the block is located)
    * 2) The segment offset (indicating how much of the block has been used in sankey already)
    */
   let next_distribution_offset = keys.reduce((target, current)=>Object.assign(target, {[current]:{height_offset: 0, segment_offset: 0}}), {})
   // We filter the elements in the data that still exist in the next division, and get their distribution
   data.filter(d=> d.length > index+1).forEach(d=> next_distribution[d[index+1]]++)

   // We again recalculate the next distribution offset for the blocks taking into account the desire for vertical center
   const NEXT_DISTRIBUTION_TOTAL = d3.sum(keys, d=>next_distribution[d])
   let next_height_offset = (TOTAL_DATA_AMOUNT - NEXT_DISTRIBUTION_TOTAL)/TOTAL_DATA_AMOUNT*viewbox.height/2
   keys.filter(key=> next_distribution[key] > 0).forEach(key=> {
     // Note that we do not render the data but store it in the next_distribution_offset array defined earlier
     next_distribution_offset[key].height_offset = next_height_offset
     next_height_offset += next_distribution[key]/TOTAL_DATA_AMOUNT*viewbox.height
   })

   // We also need to do the same calculations for the current division's block
   let block_height_offset = (TOTAL_DATA_AMOUNT - DIVISION_TOTAL_LEADS)/TOTAL_DATA_AMOUNT*viewbox.height/2
   keys.filter(key=> distribution[key] > 0).forEach(key=> {
     // Get the box's dimensions
     const block_height = distribution[key]/TOTAL_DATA_AMOUNT*viewbox.height
     const block_width = viewbox.width/SANKEY_DIVISIONS * proportions.horizontal
     /*
      * Also get the segment offset. It's the inner offset for the connection path.
      * Say a block has 5 elements and measures 5. Initially the segment offset would
      * be 0. After creating a path connecting the first 2 elements to the next transition
      * this value should update to 2, so the next path starts at y=2 and does not overlap
      */
     let segment_height_offset = 0
     keys.forEach(next_key=> {
       // Now this goes from key to next_key so we filter/count for both keys with the inner loop
       const total_transition = data.filter(d=> (d.length > index+1) && d[index]===key && d[index+1]===next_key).length
       // If no element changes from key to next_key nothing to do here
       if (total_transition === 0) return
       // We calculate the segment height with the number of elements transitioning from key to next_key
       const segment_height = total_transition / TOTAL_DATA_AMOUNT * viewbox.height * proportions.vertical
       // Create a <path> connecting the segments (part of the block). We've opted for somewhat complex math for a smooth curve
       division_container.append('path')
         .classed('transition-path', true)
         .attr('d', ()=> {
           const start_x = block_width
           const end_x = (1/proportions.horizontal)*block_width
           const curve_1_x = ((5/proportions.horizontal + proportions.horizontal)/6)*block_width
           const curve_2_x = ((1/proportions.horizontal+proportions.horizontal)/2)*block_width
           const start_y = block_height_offset+segment_height_offset
           const end_y = next_distribution_offset[next_key].height_offset + next_distribution_offset[next_key].segment_offset
           const curve_1_y = start_y
           const curve_2_y = end_y
           return `M ${start_x} ${start_y} C ${curve_1_x} ${curve_1_y} ${curve_2_x} ${curve_2_y} ${end_x} ${end_y} v ${segment_height} C ${curve_2_x} ${curve_2_y+segment_height} ${curve_1_x} ${curve_1_y+segment_height} ${start_x} ${start_y+segment_height} Z`
         })
        // Also set a few additional instruments
         .attr('data-source', key)
         .attr('data-destiny', next_key)
         // Update offset data (both for the division-n block and division-(n+1))
       segment_height_offset += segment_height
       next_distribution_offset[next_key].segment_offset += segment_height
     })
     /*
      * After we've done all transitions from key to all next-keys, we update our own offset
      * so the connecting path starts on the next block
      */
     block_height_offset += block_height
   })
  }
}
