

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

function log( message ) {
	var $status = $( "#svg-status" );
	$status.append(
		"<div class='svg-status-row'>"+message+"</div>"
	);
	$status.scrollTop( $status.get(0).scrollHeight );
}


function init_svg_paint () {

	var $container = $( "#svg-container" );

	var container_position = $container.position();

//	var container_width = 900;
//	var container_height = 720;

	var $toolbar = $( ".svg-paint-toolbar" );

	var container_width  = $container.width();
 	var container_height = window.innerHeight - ( $toolbar.height() ) - 16;

	draw = SVG('svg-container').size( container_width, container_height );

	$( "#menu-panel div.contents" ).attr( "height", container_height+"px" );

	var container_x = container_position.left;
	var container_y = container_position.top;

//	console.log( "container_x: "+container_x );
//	console.log( "container_y: "+container_y );


	var mouse_is_down = false;
	var mouse_was_moved = false;
	var down_end 	 = false;
	var down_x;
	var down_y;
	var last_move_x;
	var last_move_y;
	var move_x;
	var move_y;
	var up_x;
	var up_y;

	var last_new_e_list;
	var last_mousemove_new_e_list;

	$( "#svg-container" ).mousedown( function ( event ) {
//		console.log( "DEBUG - mousedown - event data: ");
//		console.log( event );

		mouse_is_down = true;
		mouse_was_moved = false;
		down_end   = false;
		down_x = event.offsetX;
		down_y = event.offsetY;

//		console.log( "down_x: "+down_x+" down_y: "+down_y );
//		console.log( "up_x: "+up_x+" up_y: "+up_y );
	} );

	$( "#svg-container" ).mousemove( function ( event ) {

		if ( mouse_is_down ) {

//			console.log( "DEBUG - mousemove - event data: ");
//			console.log( event );
	
			if ( mouse_was_moved ) {
				last_move_x = move_x;
				last_move_y = move_y;
			} else {
				last_move_x = down_x;
				last_move_y = down_y;
			}
			mouse_was_moved = true;

			move_x = event.offsetX;
			move_y = event.offsetY;

//			console.log( "down_x: "+down_x+" down_y: "+down_y );
//			console.log( "move_x: "+move_x+" move_y: "+move_y );


			/* BEGIN - calc radius based on last point and current point */

//			var radius = ( delta_x + delta_y ) * 1.5;
//			var radius = ( delta_x + delta_y ) / 2;

			/* END - calc radius based on last point and current point */

			if ( $("#draw-mode").val() == "trail" ) {
				// draw mode: trail


				var delta_x = move_x - last_move_x;
				var delta_y = move_y - last_move_y;
//				var delta_x = move_x - last_move_x;
//				var delta_y = move_y - last_move_y;

				if ( delta_x < 0 ) {
					delta_x = delta_x * -1;
				}
				if ( delta_y < 0 ) {
					delta_y = delta_y * -1;
				}


				// radius = square_root_of( x^2 + y^2 )
				var radius = Math.sqrt(  Math.pow( delta_x, 2 ) + Math.pow( delta_y , 2 )  );

				// make shapes a bit bigger
				radius = radius + ( radius * 0.25 );


				last_mousemove_new_e_list = draw_new_elements( { 
					x: last_move_x, 
					y: last_move_y,
					radius: radius,
					angle_x : move_x,
					angle_y : move_y
				} );


			} else {
				// draw mode: single


				var delta_x = move_x - down_x;
				var delta_y = move_y - down_y;
//				var delta_x = move_x - last_move_x;
//				var delta_y = move_y - last_move_y;

				if ( delta_x < 0 ) {
					delta_x = delta_x * -1;
				}
				if ( delta_y < 0 ) {
					delta_y = delta_y * -1;
				}


				// radius = square_root_of( x^2 + y^2 )
				var radius = Math.sqrt(  Math.pow( delta_x, 2 ) + Math.pow( delta_y , 2 )  );



				if ( last_mousemove_new_e_list !== null && last_mousemove_new_e_list !== undefined ) {
					// remove last drawn point before drawing new point

					last_mousemove_new_e_list = remove_e_list( last_mousemove_new_e_list );
				}



				last_mousemove_new_e_list = draw_new_elements( { 
					x: down_x, 
					y: down_y,
					radius: radius,
					angle_x : move_x,
					angle_y : move_y
				} );

			}



		}

	} );


	$( "#svg-container" ).mouseup( function ( event ) {

		if ( mouse_is_down ) {
			mouse_is_down = false;

//			console.log( "DEBUG - mouseup - event data: ");
//			console.log( event );
	
			down_end = true;

			up_x = event.offsetX;
			up_y = event.offsetY;


			/* BEGIN - calc radius based on last point and current point */

			if ( $("#draw-mode").val() == "trail" ) {
				// draw mode: trail
				//   - nothing to do on mouse up
			} else {
				// draw mode: single
				//   - draw final shape on mouse up


//				var delta_x = up_x - last_move_x;
//				var delta_y = up_y - last_move_y;
				var delta_x = up_x - down_x;
				var delta_y = up_y - down_y;

				if ( delta_x < 0 ) {
					delta_x = delta_x * -1;
				}
				if ( delta_y < 0 ) {
					delta_y = delta_y * -1;
				}

//				var radius = ( delta_x + delta_y ) * 1.5;
//				var radius = ( delta_x + delta_y ) / 2;

				// radius = square_root_of( x^2 + y^2 )
				var radius = Math.sqrt(  Math.pow( delta_x, 2 ) + Math.pow( delta_y , 2 )  );

				/* END - calc radius based on last point and current point */


				if ( last_mousemove_new_e_list !== null && last_mousemove_new_e_list !== undefined ) {

					// remove last drawn elements before drawing new elements
					last_mousemove_new_e_list = remove_e_list( last_mousemove_new_e_list );
				}


				last_new_e_list = draw_new_elements( { 
					x: down_x, 
					y: down_y,
					radius: radius,
					angle_x : up_x,
					angle_y : up_y,
				} );



//				console.log( "down_x: "+down_x+" down_y: "+down_y );
//				console.log( "up_x: "+up_x+" up_y: "+up_y );
			}

		}

	} );




	$( "#svg-container" ).click( function ( event ) {
//		console.log( "DEBUG - click - event data: ");
//		console.log( event );
//		var click_x = event.pageX - container_x;
//		var click_y = event.pageY - container_y;
		var click_x = event.offsetX;
		var click_y = event.offsetY;

//		console.log( "click_x: "+click_x );
//		console.log( "click_y: "+click_y );

		var radius = 40;

		if ( down_end ) {
			if ( down_x != null && down_y != null ) {

			}
		}

		var center_x = click_x;
		var center_y = click_y;

/*
		draw
			.circle( center_x, center_y, radius )
			.attr( {
				fill : "#0cc"
			} ); //example
*/

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



