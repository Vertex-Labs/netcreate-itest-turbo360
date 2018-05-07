/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\


    D3 NetGraph

    This is designed to work with the NetGraph React component.

    NetGraph calls SetData whenever it receives an updated data object.
    This triggers D3NetGraph to redraw itself.

    DEPRECATED
    This implementation was problematic because newly-added links would not be
    properly updated.  The problem likely had to do with:
    *   Not using a proper link id based on source.id + target.id
    *   Using saved references to objects that could get outdated with
        data joins/merges/updates.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/


/// SYSTEM LIBRARIES //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const d3       = require('d3')

/// PRIVATE VARS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let _width   = 1024
let _height  = 1024
let _forceProperties = {   // values for all forces
      center: {
        x: 0.5,
        y: 0.5
      },
      charge: {
        enabled: true,
        strength: -20,
        distanceMin: 1,
        distanceMax: 2000
      },
      collide: {
        enabled: true,
        strength: .7,
        iterations: 1,
        radius: 4
      },
      forceX: {
        enabled: true,
        strength: .03,
        x: .5
      },
      forceY: {
        enabled: true,
        strength: .03,
        y: .5
      },
      link: {
        enabled: true,
        distance: 30,
        iterations: 1
      }
    }



/// D3NetGraph CLASS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class D3NetGraph {



  constructor ( rootElement ) {
    /// Instance Variables - - - - - - - - - - - - - - - - - - - - - - - - - - 
    this.rootElement  = rootElement
    this.svg          = {}
    this.simulation   = {}
    this.linkGroup    = {}
    this.link         = {}
    this.nodeGroup    = {}
    this.node         = {}
    this.data         = {}
    this.defaultSize  = 5
    this.defaultColor = '#000'

    /// Constructor - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    this.svg = d3.select(rootElement).append('svg')
      .attr('width', _width)
      .attr('height',_height)
      
    this.linkGroup = this.svg.append("g")
      .attr("class", "links")
    this.nodeGroup = this.svg.append("g")
      .attr("class", "nodes")

    this.simulation = d3.forceSimulation()

    this._InitializeDisplay = this._InitializeDisplay.bind(this)
    this._Ticked            = this._Ticked.bind(this)
    this._Dragstarted       = this._Dragstarted.bind(this)
    this._Dragged           = this._Dragged.bind(this)
    this._Dragended         = this._Dragended.bind(this)

  }



  /// CLASS PUBLIC METHODS /////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  SetData ( newData ) {
      // console.error('simDataReceived',newData)
      this.data = newData

      let data = this.data
      if (data && data.nodes) {
        this._InitializeDisplay( data )
        this._InitializeSimulation( data )
      }
  }




  /// CLASS PRIVATE METHODS /////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// _InitializeDisplay
  ///     Call this after data has been loaded
  ///     This creates link and node svg objects
  ///     and sets their forceProperties
  /// 
  ///     The component `node` looks like this:
  ///         <g class="node">  // node group object
  ///            <circle>       
  ///            <text>         // label
  ///            <title>        // tooltip
  ///         </g>
  _InitializeDisplay ( data ) {

    var self = this

    this.link = this.linkGroup
      .selectAll("line")
      .data(data.edges)
      .enter().append("line");

    let nodeRoot = this.nodeGroup
      .selectAll("g")
      .data(data.nodes)

    // ENTER
    //  'node' here refers to the svg group object for each node created above
    this.node = nodeRoot.enter()
        .append("g")                   // svg group object for each node
          .attr("class", "node")
        .call(d3.drag()
          .on("start", (d) => { this._Dragstarted(d, this) })
          .on("drag",  this._Dragged)
          .on("end",   (d) => { this._Dragended(d, this) }))

    // UPDATE SELECTION
    //   If a node is not selected, its d.selected value is ''.
    this.node.merge(nodeRoot).selectAll("circle")
        .attr("stroke",       function(d) { if (d.selected) return d.selected; })
        .attr("stroke-width", function(d) { if (d.selected) return '5px'; })
    this.node.merge(nodeRoot).selectAll("text")
        .attr("color",        function(d) { if (d.selected) return d.selected; })
        .attr("font-weight",  function(d) { if (d.selected) return 'bold'; })

    // ENTER Add Group Items
    this.node.append("circle")
        .attr("r", function(d) { return d.size ?  d.size/10 : self.defaultSize; })
        .attr("fill", function(d) { return d.color ? d.color : self.defaultColor; })
    this.node.append("text")
        // .classed('noselect', true)
        .attr("font-size", 10)
        .attr("dx", 8)
        .attr("dy", ".15em")
        .text(function(d) { return d.label })
    this.node.append("title") // node tooltip
        .text(function(d) { return d.label; })

    // EXIT
    this.node.exit().remove()

    this._UpdateDisplay()
  }


  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// _UpdateDisplay
  ///       Set node radius and link display properties based on forceProperties settings
  _UpdateDisplay () {
    let forceProperties = _forceProperties
    this.node
        .attr("r", forceProperties.collide.radius)
        //.attr("stroke", forceProperties.charge.strength > 0 ? "blue" : "red")
        //.attr("stroke-width", forceProperties.charge.enabled==false ? 0 : Math.abs(forceProperties.charge.strength)/15);
    this.link
        .attr("stroke-width", forceProperties.link.enabled ? 1 : .5)
        .attr("opacity", forceProperties.link.enabled ? 1 : 0);
  }


  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// _InitializeSimulation
  ///     
  _InitializeSimulation ( data ) {
    this.simulation.nodes( data.nodes );
    //     Add forces and associate each with a name
    this.simulation
        .force("link", d3.forceLink())
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter())
        .force("forceX", d3.forceX())
        .force("forceY", d3.forceY());
    // apply properties to each of the forces
    this._UpdateForces( data )

    this.simulation.on("tick", () => {this._Ticked(this)})

  }


  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// _UpdateForces
  ///     Apply new force properties
  ///     Call this on construct and if forceProperties have changed.
  _UpdateForces ( data ) {
      // get each force by name and update the properties
      let forceProperties = _forceProperties
      this.simulation.force("center")
          .x(_width * forceProperties.center.x)
          .y(_height * forceProperties.center.y);
      this.simulation.force("charge")
          .strength(forceProperties.charge.strength * forceProperties.charge.enabled)
          .distanceMin(forceProperties.charge.distanceMin)
          .distanceMax(forceProperties.charge.distanceMax);
      this.simulation.force("collide")
          .strength(forceProperties.collide.strength * forceProperties.collide.enabled)
          .radius(function(d){return d.size/forceProperties.collide.radius;})
          .iterations(forceProperties.collide.iterations);
      this.simulation.force("forceX")
          .strength(forceProperties.forceX.strength * forceProperties.forceX.enabled)
          .x(_width * forceProperties.forceX.x);
      this.simulation.force("forceY")
          .strength(forceProperties.forceY.strength * forceProperties.forceY.enabled)
          .y(_height * forceProperties.forceY.y);
      this.simulation.force("link")
          .id(function(d) {return d.id;})
          .distance(forceProperties.link.distance)
          .iterations(forceProperties.link.iterations)
          .links(forceProperties.link.enabled ? data.edges : []);

      // updates ignored until this is run
      // restarts the simulation (important if simulation has already slowed down)
      this.simulation.alpha(1).restart();
  }


  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// _Ticked
  ///       Update the display positions after each simulation tick
  _Ticked ( self ) {
    self.link
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });
    self.node.attr("transform", function(d) { return "translate("+d.x+","+d.y+")"; });

  }


  /// UI EVENT HANDLERS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  _Dragstarted (d, self) {
    if (!d3.event.active) self.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  _Dragged (d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }
  _Dragended (d, self) {
    if (!d3.event.active) self.simulation.alphaTarget(0.0001);
    d.fx = null;
    d.fy = null;
  }
  // update window size-related forces
  // d3.select(window).on("resize", function(){
  //     width = +svg.node().getBoundingClientRect().width;
  //     height = +svg.node().getBoundingClientRect().height;
  //     updateForces();
  // });
}




/// EXPORT MODULE /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = D3NetGraph