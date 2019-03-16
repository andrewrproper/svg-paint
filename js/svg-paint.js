

let base_path_width = 200;

let debug_enabled = 1;
let debug_verbose_enabled = 1; // whether to dump objects or just print as string
let diag_enabled = 0;

let svg_config;

let log = {
	diag : function ( message_or_object ) {
		if ( diag_enabled ) {
			if ( typeof message_or_object === "object" ) {
				console.log( message_or_object );
			} else {
				console.log( "DIAG - "+message_or_object );
			}
		}
	},
	debug: function ( message_or_object ) {
		if ( debug_enabled ) {
			if ( typeof message_or_object === "object" ) {
				if ( debug_verbose_enabled ) {
					console.log( message_or_object );
				} else {
					console.log( ""+message_or_object );
				}
			} else {
				console.log( "DEBUG - "+message_or_object );
			}
		}
	},
	status: function ( message ) {
		let $status = $( "#svg-status" );
		$status.append(
			"<div class='svg-status-row'>"+message+"</div>"
		);
		$status.scrollTop( $status.get(0).scrollHeight );
	},
}



let svg_paint_canvas = {

	svg 					: null,
	jq_container 	: null,
	jq_toolbar   	: null,
	container_x   : null,
	container_y   : null,

	resize : function () {

		// only run if container has been initialized
		if ( this.jq_container !== null ) {

			let container_position 	= this.jq_container.position();

			let container_width  		= this.jq_container.width();
 			let container_height 		= window.innerHeight - ( this.jq_toolbar.height() ); // - 16;

			this.container_x 				= container_position.left;
			this.container_y 				= container_position.top;

			this.svg.size( container_width, container_height );
			log.debug( "canvas.resize: resized svg to: " + container_width + " x " + container_height );

			// this doesn't really belong in this object
			$( "#menu-panel div.contents" ).attr( "height", container_height+"px" );

		} else {
			log.debug( "canvas.resize: doing nothing b/c container not initialized: " );
			log.debug( this.jq_container );
		}
	},

	init : function ( jq_container, jq_toolbar ) {
		let self = this

		// 1) initialize this object

		this.jq_container = jq_container;
		this.jq_toolbar 	= jq_toolbar;

		this.svg = SVG('svg-container');

		// 2) call resize() on this object

		this.resize();

		// 3) initialize event handlers


		$( window ).resize( function () {
			self.resize();
		} );

		this.jq_container.on( "touchmove", function ( event ) {
			// prevent scrolling when drawing on svg container
			event.preventDefault();
		} );
	
		this.jq_container.on( "vmousedown", function ( event ) {
			svg_paint_canvas_events.mousedown( event, self.container_x, self.container_y );
		} );
	
		this.jq_container.on( "vmousemove", function ( event ) {
			svg_paint_canvas_events.mousemove( event, self.container_x, self.container_y );
		} );
	
		this.jq_container.on( "vmouseup", function ( event ) {
			svg_paint_canvas_events.mouseup( event, self.container_x, self.container_y );
		} );

	},

	clear : function () {
		this.svg.clear();
	},

}





let tool_shape_paths = {};


/*
	receives:
		params:  object with properties:

			// main information
			x  : integer,
			y  : integer,
			radius  : integer,

			// for applying rotation:
			angle_x : integer,
			angle_y : integer,

	returns:
		svg_element
*/
function draw_new_elements ( params ) {

	var draw_opacity 	= $("#draw-opacity").val();
	var draw_size 		= $("#draw-size").val();

	log.debug( "draw_opacity: "+draw_opacity );
	log.debug( "draw_size: "+draw_size );

	draw_opacity /= 100;

	var type 						= $("#draw-type").val();
	var fill 						= $( "#fill-color-picked" ).val();
	var fill_opacity 		= draw_opacity;
	var stroke					= $( "#stroke-color-picked" ).val();
	var stroke_opacity 	= draw_opacity;
	var stroke_width 		= $("#draw-stroke-width").val();
	var blur_amount 		= $("#draw-blur-amount").val();

	if ( fill === undefined || fill == "" ) {
		fill = "#9df";
	}
	if ( stroke === undefined || stroke == "" ) {
		stroke = "#555";
	}


	var new_e_list = []; // svg element
	var new_e_attr_by_index = {}; // svg element
	var keep_attr = {  // which path attributes to keep
		"stroke-width" : true,
		"stroke-linecap" : true,
		"stroke-linejoin" : true,
		"stroke-opacity" : true
	};
	var keep_attr_with_value = {  // which path attributes to keep
		"stroke" : "none",
	};

	var radius = params.radius;

	radius = radius + ( draw_size / 2 );

	var centre_x = params.x;
	var centre_y = params.y;

	if ( type == "circle" && params.x && params.y && params.radius ) {
		var new_e = svg_paint_canvas.svg.circle( radius );
		new_e.center( centre_x, centre_y );
		new_e_list.push( new_e );
	} else if ( type == "square" && params.x && params.y && params.radius ) {
		new_e = svg_paint_canvas.svg.rect( 
			radius * 2,  // width
			radius * 2,  // height
		).center( 
			centre_x, 
			centre_y 
		);
		new_e_list.push( new_e );
	} else {
		var shape_key = type;
		if ( tool_shape_paths[ shape_key ] !== undefined ) {
			var $paths = tool_shape_paths[ shape_key ];

			log.debug( "shape_key ["+shape_key+"] paths: " );
			log.debug( $paths );

			$paths.each( function ( index, path ) {
				log.debug( "index ["+index+"] path: " );
				log.debug( path );
				var $path = $( path );

				var path_d_text = $path.attr( "d" );

				// create object of attributes to keep from imported path
				var style				= $path.attr( "style" );
				var style_words = style.split( ";" );
				var new_e_attr 	= {};
				$.each( style_words, function ( index, value ) {
					var pieces = value.split( ":" );
					var key = pieces[0];
					var value = pieces[1];

					if ( value !== undefined && value != "" ) {
						if ( 
							keep_attr[ key ] ||
							(
								keep_attr_with_value[ key ] &&
								keep_attr_with_value[ key ] == value
							)
						) {
							new_e_attr[ key ] = value;
							log.diag( "new_e_attr ["+key+"] = "+value );
						}
					}
				} );

				new_e = svg_paint_canvas.svg.path( path_d_text ); // get a SVG.Path object, for use for import

				new_e.center( centre_x, centre_y );

				// scale_factor adjusts scaling so that it matches where the pointer moves
				let scale_factor = 4;

				// scale from 200px down, then up to relative size
				new_e.transform( { "scale": base_path_width * 0.00001, "relative": true } );
				new_e.transform( { "scale": radius * scale_factor, "relative": true } );

				new_e_list.push( new_e );
				new_e_attr_by_index[ new_e_list.length - 1 ] = new_e_attr;
			} );

		} else {
			message = "ERROR - draw_new_elements() - unhandled args, no shape ["+shape_key+"]";
			log.debug( message );
		}
	}

	if ( new_e_list.length > 0 ) {
		log.diag( "drew new_e_list: " );
		log.diag( new_e_list );

		$.each( new_e_list, function( index ) {
			new_e_list[ index ].attr( {
				fill 							: fill,
				'fill-opacity' 		: fill_opacity,
				stroke 						: stroke,
				'stroke-opacity' 	: stroke_opacity,
				'stroke-width' 		: stroke_width
			} ); //example
	
			// allow kept imported attributes to overide default settings (above)
			var new_e_attr = new_e_attr_by_index[ index ];
			if ( new_e_attr !== undefined ) {
				new_e_list[ index ].attr( new_e_attr );
			}
		} );


		// rotate SVG to face in direction of last drag
		if ( params.x && params.x && params.angle_x && params.angle_y ) {

			log.debug( "params.x ["+params.x+"] params.y ["+params.y+"]" );
			log.debug( "angle_x ["+params.angle_x+"] angle_y ["+params.angle_y+"]" );


			// find direction
			if ( params.angle_x > params.x ) {
				// to right
				if ( params.y > params.angle_y ) {
					// to top
					log.debug( "Q1 : right top" );
				} else if ( params.y < params.angle_y ) {
					// to bottom
					log.debug( "Q1 : right bottom" );
				}
			} else if ( params.angle_x < params.x ) {
				// to left
				if ( params.y > params.angle_y ) {
					// top
					log.debug( "Q4 : left top" );
				} else if ( params.y < params.angle_y ) {
					// to bottom
					log.debug( "Q3 : left bottom" );
				}
			}

			var centre_point 		= new SVG.math.Point( params.x, params.y );
			var angle_point 		= new SVG.math.Point( params.angle_x, params.angle_y );

			var rotate_radians  = SVG.math.angle( centre_point, angle_point );
			var rotate_degrees  = SVG.math.deg( rotate_radians );

			// adjust to make shapes point be vertical when pointer is below, 
			// not when it is to the right.
			rotate_degrees -= 90; 

			log.debug( "rotate_radians: "+rotate_radians );
			log.debug( "rotate_degrees: "+rotate_degrees );

			$.each( new_e_list, function( index ) {
				new_e_list[ index ].rotate( rotate_degrees );
			} );

		} else {
			log.debug( "no rotate_angle" );
		}

		if ( blur_amount != "" && blur_amount > 0 ) {
			$.each( new_e_list, function( index ) {
				new_e_list[ index ].filter( function( add ) {
					add.gaussianBlur( blur_amount )
				} );
			} );
		}


		return new_e_list;
	} else {
		log.debug( "svg_e not defined" );
	}
	

	return undefined;
}



let svg_paint_ui = {

	remove_e_list : function ( e_list_to_remove ) {

		$.each( e_list_to_remove, function( index ) {
			e_list_to_remove[ index ].remove();
		} );
		return [];
	},


	/* 

	load text from SVG files into data structures

	   current supported: 
	    - read text from: svg.g.path:first.d 
	
	*/
	init_from_config : function () {
		var self = this;

		// search for paths
		$.ajax( {
			method: "get",
			url: "config.json",
			dataType: "JSON",
			success: function ( data, text_status, jq_xhr ) {
				log.debug( "config data: " );
				log.debug( data );
	
				svg_config = data;
	
				if ( svg_config.shapes !== undefined ) {
					if ( svg_config.shapes.paths !== undefined ) {
						$.each( svg_config.shapes.paths, function ( index ) {
							var shape_data 	= svg_config.shapes.paths[ index ];
							var shape_key 	= shape_data.key;
							var shape_name 	= shape_data.name;
							var shape_is_default 	= false;
							if ( shape_data.default !== undefined ) {
								shape_is_default = shape_data.default;
							}
							log.debug( "shapes.paths["+index+"] shape key ["+shape_key+"] name ["+shape_name+"]" );
							self.load_svg_path_data( 
								shape_key, 
								shape_name, 
								shape_is_default, 
								"shapes/paths/"+shape_key+".svg"  // shape file URL
							);
						} );
					}
				}
	
			},
		} );
	
	},


	load_svg_path_data : function ( shape_key, shape_name, shape_is_default, file_url ) {
	
		log.debug( "get shape ["+shape_key+"] url: "+file_url );
		$.ajax( {
			method: "get",
			url: file_url,
			dataType: "xml",
			success: function ( svg_xml_doc, text_status, jq_xhr ) {
				let $xml_doc = $( svg_xml_doc );
				log.debug( "svg xml doc: " );
				log.debug( svg_xml_doc );
				let $paths = $xml_doc.find("svg").find("path");
	
				tool_shape_paths[ shape_key ] = $paths;
	
				log.debug( "loaded shape key ["+shape_key+"] name ["+shape_name+"] svg file paths: " );
				log.debug( $paths );
	
				let $new_option = $( '<option/>', { 
	        value: shape_key,
	        text : shape_name 
				} );
	
				// add new option to select list with id "draw-type"
				$( "select#draw-type" ).append( $new_option );
	
				if ( shape_is_default ) {
					// make this shape active
					$( "select#draw-type" ).val( shape_key ).trigger( "change" ); 
				}
	
			},
		} );
	
	
	},

};



let svg_paint_canvas_events = {

	mouse_is_down : false,
	mouse_was_moved : false,
	down_end 	 : false,
	down_x : 0,
	down_y : 0,
	last_move_x : 0,
	last_move_y : 0,
	move_x : 0,
	move_y : 0,
	up_x : 0,
	up_y : 0,

	last_new_e_list : [],
	last_mousemove_new_e_list : [],

	mousedown: function ( event, container_x, container_y ) {
		this.mouse_is_down = true;
		this.mouse_was_moved = false;
		this.down_end   = false;

		// switch from .offsetX to .pageX to accomodate jquery mobile "vmousemove"
		this.down_x = event.pageX - container_x;
		this.down_y = event.pageY - container_y;
	},


	mousemove: function ( event, container_x, container_y ) {

		if ( this.mouse_is_down ) {

			if ( this.mouse_was_moved ) {
				this.last_move_x = this.move_x;
				this.last_move_y = this.move_y;
			} else {
				this.last_move_x = this.down_x;
				this.last_move_y = this.down_y;
			}
			this.mouse_was_moved = true;

			// switch from .offsetX to .pageX to accomodate jquery mobile "vmousemove"
			this.move_x = event.pageX - container_x;
			this.move_y = event.pageY - container_y;

			if ( $("#draw-mode").val() == "trail" ) {
				// draw mode: trail

				let delta_x = this.move_x - this.last_move_x;
				let delta_y = this.move_y - this.last_move_y;

				if ( delta_x < 0 ) {
					delta_x = delta_x * -1;
				}
				if ( delta_y < 0 ) {
					delta_y = delta_y * -1;
				}

				// radius = square_root_of( x^2 + y^2 )
				let radius = Math.sqrt(  Math.pow( delta_x, 2 ) + Math.pow( delta_y , 2 )  );

				// make shapes a bit bigger
				radius = radius + ( radius * 0.25 );

				this.last_mousemove_new_e_list = draw_new_elements( { 
					x: this.last_move_x, 
					y: this.last_move_y,
					radius: radius,
					angle_x : this.move_x,
					angle_y : this.move_y
				} );

			} else {
				// draw mode: single

				let delta_x = this.move_x - this.down_x;
				let delta_y = this.move_y - this.down_y;

				if ( delta_x < 0 ) {
					delta_x = delta_x * -1;
				}
				if ( delta_y < 0 ) {
					delta_y = delta_y * -1;
				}

				// radius = square_root_of( x^2 + y^2 )
				let radius = Math.sqrt(  Math.pow( delta_x, 2 ) + Math.pow( delta_y , 2 )  );

				if ( this.last_mousemove_new_e_list !== null && this.last_mousemove_new_e_list !== undefined ) {
					// remove last drawn point before drawing new point

					this.last_mousemove_new_e_list = svg_paint_ui.remove_e_list( this.last_mousemove_new_e_list );
				}

				this.last_mousemove_new_e_list = draw_new_elements( { 
					x: this.down_x, 
					y: this.down_y,
					radius: radius,
					angle_x : this.move_x,
					angle_y : this.move_y
				} );

			}

		}

	},

	mouseup : function ( event, container_x, container_y ) {

		if ( this.mouse_is_down ) {
			this.mouse_is_down = false;

			this.down_end = true;

			// switch from .offsetX to .pageX to accomodate jquery mobile "vmousemove"
			this.up_x = event.pageX - container_x;
			this.up_y = event.pageY - container_y;


			/* BEGIN - calc radius based on last point and current point */

			if ( $("#draw-mode").val() == "trail" ) {
				// draw mode: trail
				//   - nothing to do on mouse up
			} else {
				// draw mode: single
				//   - draw final shape on mouse up


				let delta_x = this.up_x - this.down_x;
				let delta_y = this.up_y - this.down_y;

				if ( delta_x < 0 ) {
					delta_x = delta_x * -1;
				}
				if ( delta_y < 0 ) {
					delta_y = delta_y * -1;
				}

				// radius = square_root_of( x^2 + y^2 )
				let radius = Math.sqrt(  Math.pow( delta_x, 2 ) + Math.pow( delta_y , 2 )  );

				/* END - calc radius based on last point and current point */

				if ( this.last_mousemove_new_e_list !== null && this.last_mousemove_new_e_list !== undefined ) {

					// remove last drawn elements before drawing new elements
					this.last_mousemove_new_e_list = svg_paint_ui.remove_e_list( this.last_mousemove_new_e_list );
				}


				this.last_new_e_list = draw_new_elements( { 
					x: this.down_x, 
					y: this.down_y,
					radius: radius,
					angle_x : this.up_x,
					angle_y : this.up_y,
				} );

			}

		}

	},


};







function init_svg_paint () {

	let $toolbar = $( ".svg-paint-toolbar" );

	let $container = $( "#svg-container" );

	svg_paint_canvas.init( $container, $toolbar );

	$( "#draw-mode" ).change( function ( event ) {
		let value = $( this ).val();

		let target_id = "draw-size-wrap";
		if ( value == "trail" ) {
				$( "#"+target_id ).show();
		} else {
				$( "#"+target_id ).hide();
		}

	} );


	$( "#canvas-clear" ).click( function ( event ) {
		svg_paint_canvas.clear();
	} );

	svg_paint_ui.init_from_config();

}



$( function () {

	init_svg_paint();

} );


/* 
vim: ts=2 paste
*/



