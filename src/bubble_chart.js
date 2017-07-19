/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */
function bubbleChart() {
  // Constants for sizing
  var width = 1000;
  var height = 600;
  var
    padding = 3, // separation between same-color circles
    clusterPadding = 9, // separation between different-color circles
    maxRadius = 12;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 2 };

  var yearCenters = {
    // 2008: { x: width / 3, y: height / 2 },
    // 2009: { x: width / 2, y: height / 2 },
    // 2010: { x: 2 * width / 3, y: height / 2 }
    'male': { x: width/3, y: height / 2 },
    'female': { x: 2*width / 3, y: height / 2 }
    // 1: {x: width / 3, y: height / 2},
    // 8: {x: width / 2, y: height / 2}
  };

  // X locations of the year titles.
  var yearsTitleX = {
    // 2008: 160,
    // 2009: width / 2,
    // 2010: width - 160
    'male': width/3,
    'female': 2*width/3
    // 1: 160,
    // 8: width / 2
  };

  // @v4 strength to apply to the position forces
  var forceStrength = 0.02; //0.03

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];

  var textLabel = null;

  // Charge function that is called for each node.
  // As part of the ManyBody force.
  // This is what creates the repulsion between nodes.
  //
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  //
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  //
  // Charge is negative because we want nodes to repel.
  // @v4 Before the charge was a stand-alone attribute
  //  of the force layout. Now we can use it as a separate force!
  function charge(d) {
    return -Math.pow(d.radius, 2.0) * forceStrength * 1.5;
  }

  // Here we create a force layout and
  // @v4 We create a force simulation now and
  //  add forces to it.
  var simulation = d3.forceSimulation()
    .velocityDecay(0.2)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', ticked);

  // @v4 Force starts up automatically,
  //  which we don't want as there aren't any nodes yet.
  simulation.stop();




  // Nice looking colors - no reason to buck the trend
  // @v4 scales now have a flattened naming scheme


var movieNamesDomain=[];

d3.csv("data/AllMoviesSummary.csv", function(csv){
            csv.map(function(d){
                movieNamesDomain.push(d.movie);
            })
            //called after the AJAX is success
            console.log("Array of movie names",movieNamesDomain);
            console.log("field1", movieNamesDomain[0]);
        });


  var fillColor = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(movieNamesDomain);
  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number.
    var maxAmount = d3.max(rawData, function (d) { return +d.radius; });

    // Sizes bubbles based on area.
    // @v4: new flattened scale names.
    var radiusScale = d3.scalePow()
      .exponent(0.7) //0.5
      .range([0.1, 80])
      .domain([0, maxAmount]);

    /*

    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    var myNodes = rawData.map(function (d) {
      return {
        id: d.id,
        radius: radiusScale(+d.radius), //d.total_amount
        value: +d.Total_Words, //total_amount
        name: d.Character, //grnat_title
        //org: d.organization,
        gender: d.Gender, //group: d.group
        speakingturns: d.speaking_turns, //year: d. start_year
        x: Math.random() * 900,
        y: Math.random() * 800
      };
    });

    */

    var myNodes = rawData.map(function (d) {
      return {
        id: d.movie,
        radius: radiusScale(+d.radius),
        value: +d.percentage_female_line,
        name: d.movie,
        x: Math.random() * 900,
        y: Math.random() * 800
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }

  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {
    // convert raw data into nodes data
    nodes = createNodes(rawData);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
      .data(nodes, function (d) { return d.id; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    // @v4 Selections are immutable, so lets capture the
    //  enter selection to apply our transtition to below.
    var bubblesEnter = bubbles.enter().append("g").attr("class", "node");




    var bubblesE = bubblesEnter.append('circle')
        .classed('bubble', true)
        .attr('r', function (d) { return d.radius})
        .attr('fill', function (d) { return fillColor(d.name); })
        .attr('stroke', function (d) { return d3.rgb(fillColor(d.name)).darker(); })
        .attr('stroke-width', 2)
        .on('mouseover', showDetail)
        .on('mouseout', hideDetail);

    textLabel = bubblesEnter.append("text")
        .attr("dx", 0)
        .attr("dy", 0)
        .attr("text-anchor", "middle")
        .text(function(d) {
            console.log(d.name);
            return d.name;
        })
        .style("stroke", "black");






    /*


    /*
  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .on("click", click)
      .call(force.drag);

  nodeEnter.append("circle")
      .attr("r", function(d) { return Math.sqrt(d.size) / 10 || 4.5; });

  nodeEnter.append("text")
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });

  node.select("circle")
      .style("fill", color);


*/



/*
    var node = svg.selectAll("circle")
    .data(nodes)
    .enter().append("g");

    node.append("circle")
        .style("fill", function (d) { return color(d.cluster); })
        .attr("r", function(d){return d.radius})

    node.append("text")
    .text(function (d) { return d.name; })
    .attr("dx", -10)
    .attr("dy", ".35em")
    .text(function (d) { return d.name; })
    .style("stroke", "gray");

    function tick(e) {
    node.each(cluster(10 * e.alpha * e.alpha))
        .each(collide(.5))
    //.attr("transform", functon(d) {});
    .attr("transform", function (d) {
        var k = "translate(" + d.x + "," + d.y + ")";
        return k;
    })

    */

    // @v4 Merge the original empty selection and the enter selection
    bubbles = bubbles.merge(bubblesE);




    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
      .duration(2000)
      .attr('r', function (d) { return d.radius; });



    // Set the simulation's nodes to our newly created nodes array.
    // @v4 Once we set the nodes, the simulation will start running automatically!
    simulation.nodes(nodes);

    // Set initial layout to single group.
    groupBubbles();

}








/*
  var group = d3.select("circle").append(function() { return bubbles});

  group.append("text")
        .enter()
        .text(function (d) { return d.name; })
        .attr("dx", function(d) { return d.x; })
        .attr("dy", function (d) {return d.y; })
        .text(function (d) { return d.name; })
        .style("stroke", "black");

  };
  */



/*
  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .on("click", click)
      .call(force.drag);

  nodeEnter.append("circle")
      .attr("r", function(d) { return Math.sqrt(d.size) / 10 || 4.5; });

  nodeEnter.append("text")
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });

  node.select("circle")
      .style("fill", color);


*/


  /*
   * Callback function that is called after every tick of the
   * force simulation.
   * Here we do the acutal repositioning of the SVG circles
   * based on the current x and y values of their bound node data.
   * These x and y values are modified by the force simulation.
   */


  function ticked() {


    bubbles
      .each (collide(.5))
      .attr('cx', function (d) { return d.x; })
      .attr('cy', function (d) { return d.y; });

    textLabel.attr("dx", function (d) {return d.x;}).attr("dy", function(d) {
        return d.y;
    });
  }



  function collide(alpha) {
  var quadtree = d3.quadtree(nodes);
  return function(d) {
    var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
        nx1 = d.x - r,
        nx2 = d.x + r,
        ny1 = d.y - r,
        ny2 = d.y + r;
    quadtree.visit(function(quad, x1, y1, x2, y2) {
      if (quad.point && (quad.point !== d)) {
        var x = d.x - quad.point.x,
            y = d.y - quad.point.y,
            l = Math.sqrt(x * x + y * y),
            r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
        if (l < r) {
          l = (l - r) / l * alpha;
          d.x -= x *= l;
          d.y -= y *= l;
          quad.point.x += x;
          quad.point.y += y;
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    });
  };
}





  /*
   * Provides a x value for each node to be used with the split by year
   * x force.
   */
  function nodeYearPos(d) {
    return yearCenters[d.gender].x; //lowercase? riginally d.gender
  }


  /*
   * Sets visualization in "single group mode".
   * The year labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles() {
    hideYearTitles();

    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force('x', d3.forceX().strength(forceStrength).x(center.x));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }


  /*
   * Sets visualization in "split by year mode".
   * The year labels are shown and the force layout
   * tick function is set to move nodes to the
   * yearCenter of their data's year.
   */
  function splitBubbles() {
    showYearTitles();

    // @v4 Reset the 'x' force to draw the bubbles to their year centers
    simulation.force('x', d3.forceX().strength(forceStrength).x(nodeYearPos));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  /*
   * Hides Year title displays.
   */
  function hideYearTitles() {
    svg.selectAll('.gender').remove(); //.gender
  }

  /*
   * Shows Year title displays.
   */
  function showYearTitles() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var yearsData = d3.keys(yearsTitleX);
    var years = svg.selectAll('.gender') //.gender
      .data(yearsData);

    years.enter().append('text')
      .attr('class', 'gender')
      .attr('x', function (d) { return yearsTitleX[d]; })
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text(function (d) { return d; });
  }


  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    /*

    var content = '<span class="name">Name: </span><span class="value">' +
                  d.name +
                  '</span><br/>' +
                  '<span class="name">Lines: </span><span class="value">' +
                  addCommas(d.value) +
                  '</span><br/>' +
                  '<span class="name">Speaking Turns: </span><span class="value">' +
                  d.speakingturns +
                  '</span><br/>' +
                  '<span class="name">Gender: </span><span class="value">' +
                  d.gender +
                  '</span>';

                  */
    var content = '<span class="name"> Name: </span><span class="value">' +
                  d.name +
                  '</span><br/>';

    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
      .attr('stroke', d3.rgb(fillColor(d.gender)).darker()); //lowercase?

    tooltip.hideTooltip();
  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by year" modes.
   *
   * displayName is expected to be a string and either 'year' or 'all'.
   * 'year' is set on "Split" and 'all' is for "All" to make title appear
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'year') {
      splitBubbles();
    } else {
      groupBubbles();
    }
  };


  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart('#vis', data);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
    .selectAll('.button')
    .on('click', function () {
      // Remove active class from all buttons
      d3.selectAll('.button').classed('active', false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed('active', true);

      // Get the id of the button
      var buttonId = button.attr('id');

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

/*
 * Helper function to convert a number into a string
 * and add commas to it to improve presentation.
 */
function addCommas(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }

  return x1 + x2;
}

// Load the data.
d3.csv('data/AllMoviesSummary.csv', display);

// setup the buttons.
setupButtons();
