

var base_path_width = 200;

var debug_enabled = 1;
var debug_verbose_enabled = 1; // whether to dump objects or just print as string
var diag_enabled = 0;

var svg_config;

function diag ( message_or_object ) {
	if ( diag_enabled ) {
		if ( typeof message_or_object === "object" ) {
			console.log( message_or_object );
		} else {
			console.log( "DIAG - "+message_or_object );
		}
	}
}
function debug ( message_or_object ) {
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
}

function log( message ) {
	var $status = $( "#svg-status" );
	$status.append(
		"<div class='svg-status-row'>"+message+"</div>"
	);
	$status.scrollTop( $status.get(0).scrollHeight );
}





var draw;
var tool_shape_paths = {};


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

	debug( "draw_opacity: "+draw_opacity );
	debug( "draw_size: "+draw_size );

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
		var new_e = draw.circle( radius );
		new_e.center( centre_x, centre_y );
		new_e_list.push( new_e );
	} else if ( type == "square" && params.x && params.y && params.radius ) {
		new_e = draw.rect( 
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

			debug( "shape_key ["+shape_key+"] paths: " );
			debug( $paths );

			$paths.each( function ( index, path ) {
				debug( "index ["+index+"] path: " );
				debug( path );
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
							diag( "new_e_attr ["+key+"] = "+value );
						}
					}
				} );

				new_e = draw.path( path_d_text ); // get a SVG.Path object, for use for import

				new_e.center( centre_x, centre_y );

				// scale from 200px down, then up to relative size
				new_e.transform( { "scale": base_path_width * 0.00001, "relative": true } );
				new_e.transform( { "scale": radius * 2, "relative": true } );

				new_e_list.push( new_e );
				new_e_attr_by_index[ new_e_list.length - 1 ] = new_e_attr;
			} );

		} else {
			message = "ERROR - draw_new_elements() - unhandled args, no shape ["+shape_key+"]";
			debug( message );
		}
	}

	if ( new_e_list.length > 0 ) {
		diag( "drew new_e_list: " );
		diag( new_e_list );

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

			debug( "params.x ["+params.x+"] params.y ["+params.y+"]" );
			debug( "angle_x ["+params.angle_x+"] angle_y ["+params.angle_y+"]" );


			// find direction
			if ( params.angle_x > params.x ) {
				// to right
				if ( params.y > params.angle_y ) {
					// to top
					debug( "Q1 : right top" );
				} else if ( params.y < params.angle_y ) {
					// to bottom
					debug( "Q1 : right bottom" );
				}
			} else if ( params.angle_x < params.x ) {
				// to left
				if ( params.y > params.angle_y ) {
					// top
					debug( "Q4 : left top" );
				} else if ( params.y < params.angle_y ) {
					// to bottom
					debug( "Q3 : left bottom" );
				}
			}

			var centre_point 		= new SVG.math.Point( params.x, params.y );
			var angle_point 		= new SVG.math.Point( params.angle_x, params.angle_y );

			var rotate_radians  = SVG.math.angle( centre_point, angle_point );
			var rotate_degrees  = SVG.math.deg( rotate_radians );

			// adjust to make shapes point be vertical when pointer is below, 
			// not when it is to the right.
			rotate_degrees -= 90; 

			debug( "rotate_radians: "+rotate_radians );
			debug( "rotate_degrees: "+rotate_degrees );

			$.each( new_e_list, function( index ) {
				new_e_list[ index ].rotate( rotate_degrees );
			} );

		} else {
			debug( "no rotate_angle" );
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
		debug( "svg_e not defined" );
	}
	

	return undefined;
}


var svg_paint = {

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

	mousedown: function ( event ) {
		this.mouse_is_down = true;
		this.mouse_was_moved = false;
		this.down_end   = false;
		this.down_x = event.offsetX;
		this.down_y = event.offsetY;
	},


	mousemove: function ( event ) {

		if ( this.mouse_is_down ) {

			if ( this.mouse_was_moved ) {
				this.last_move_x = this.move_x;
				this.last_move_y = this.move_y;
			} else {
				this.last_move_x = this.down_x;
				this.last_move_y = this.down_y;
			}
			this.mouse_was_moved = true;

			this.move_x = event.offsetX;
			this.move_y = event.offsetY;

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

				let delta_x = move_x - down_x;
				let delta_y = move_y - down_y;

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

					this.last_mousemove_new_e_list = remove_e_list( this.last_mousemove_new_e_list );
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

	mouseup : function ( event ) {

		if ( this.mouse_is_down ) {
			this.mouse_is_down = false;

			this.down_end = true;

			this.up_x = event.offsetX;
			this.up_y = event.offsetY;


			/* BEGIN - calc radius based on last point and current point */

			if ( $("#draw-mode").val() == "trail" ) {
				// draw mode: trail
				//   - nothing to do on mouse up
			} else {
				// draw mode: single
				//   - draw final shape on mouse up


				var delta_x = this.up_x - this.down_x;
				var delta_y = this.up_y - this.down_y;

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
					this.last_mousemove_new_e_list = remove_e_list( this.last_mousemove_new_e_list );
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

	var $container = $( "#svg-container" );

	var container_position = $container.position();

	var $toolbar = $( ".svg-paint-toolbar" );

	var container_width  = $container.width();
 	var container_height = window.innerHeight - ( $toolbar.height() ) - 16;

	draw = SVG('svg-container').size( container_width, container_height );

	$( "#menu-panel div.contents" ).attr( "height", container_height+"px" );

	var container_x = container_position.left;
	var container_y = container_position.top;


	$( "#svg-container" ).mousedown( function ( event ) {
		svg_paint.mousedown( event );
	} );

	$( "#svg-container" ).mousemove( function ( event ) {
		svg_paint.mousemove( event );
	} );


	$( "#svg-container" ).mouseup( function ( event ) {
		svg_paint.mouseup( event );
	} );


	$( "#draw-mode" ).change( function ( event ) {
		var value = $( this ).val();

		var target_id = "draw-size-wrap";
		if ( value == "trail" ) {
				$( "#"+target_id ).show();
		} else {
				$( "#"+target_id ).hide();
		}

	} );


	init_from_config();

}


function remove_e_list ( e_list_to_remove ) {

	$.each( e_list_to_remove, function( index ) {
		e_list_to_remove[ index ].remove();
	} );
	return [];
}


/* 

load text from SVG files into data structures

   current supported: 
    - read text from: svg.g.path:first.d 

*/
function init_from_config () {

	// search for paths
	$.ajax( {
		method: "get",
		url: "config.json",
		dataType: "JSON",
		success: function ( data, text_status, jq_xhr ) {
			debug( "config data: " );
			debug( data );

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
						debug( "shapes.paths["+index+"] shape key ["+shape_key+"] name ["+shape_name+"]" );
						load_svg_path_data( 
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

}



function load_svg_path_data ( shape_key, shape_name, shape_is_default, file_url ) {

	debug( "get shape ["+shape_key+"] url: "+file_url );
	$.ajax( {
		method: "get",
		url: file_url,
		dataType: "xml",
		success: function ( svg_xml_doc, text_status, jq_xhr ) {
			var $xml_doc = $( svg_xml_doc );
			debug( "svg xml doc: " );
			debug( svg_xml_doc );
			var $paths = $xml_doc.find("svg").find("path");

			tool_shape_paths[ shape_key ] = $paths;

			debug( "loaded shape key ["+shape_key+"] name ["+shape_name+"] svg file paths: " );
			debug( $paths );

			var $new_option = $( '<option/>', { 
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


}



$( function () {

	init_svg_paint();

} );


/* 
vim: ts=2 paste
*/



