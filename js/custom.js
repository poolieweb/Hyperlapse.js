$(function () {


    var start_point = new google.maps.LatLng(44.3431, 6.783936);
    var end_point = new google.maps.LatLng(44.340578, 6.782684);
    var lookat_point = new google.maps.LatLng(44.34232747290594, 6.786460550292986);
    var map, directions_renderer, directions_service, streetview_service, geocoder;
    var start_pin, end_pin, pivot_pin, camera_pin;
    var _elevation = 0;
    var _route_markers = [];

    function show(msg) {
        document.getElementById("text").innerHTML = msg;
    }

    function init() {

        if (window.location.hash) {
            parts = window.location.hash.substr(1).split(',');
            start_point = new google.maps.LatLng(parts[0], parts[1]);
            lookat_point = new google.maps.LatLng(parts[2], parts[3]);
            end_point = new google.maps.LatLng(parts[4], parts[5]);
            _elevation = parts[6] || 0;
        }

        /* Map */

        function snapToRoad(point, callback) {
            var request = {origin: point, destination: point, travelMode: google.maps.TravelMode["DRIVING"]};
            directions_service.route(request, function (response, status) {
                if (status == "OK") callback(response.routes[0].overview_path[0]);
                else callback(null);
            });
        }

        function changeHash() {
            window.location.hash = start_pin.getPosition().lat() + ',' + start_pin.getPosition().lng() + ','
            + pivot_pin.getPosition().lat() + ',' + pivot_pin.getPosition().lng() + ','
            + end_pin.getPosition().lat() + ',' + end_pin.getPosition().lng() + ','
            + _elevation;
        }

        var mapOpt = {
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            center: start_point,
            zoom: 15
        };

        map = new google.maps.Map(document.getElementById("map"), mapOpt);
        geocoder = new google.maps.Geocoder();

        //Do we need this as it does hide some road details.
        // var overlay = new google.maps.StreetViewCoverageLayer();
        // overlay.setMap(map);

        directions_service = new google.maps.DirectionsService();
        directions_renderer = new google.maps.DirectionsRenderer({draggable: false,suppressMarkers:true, markerOptions: {visible: true}});
        directions_renderer.setMap(map);
        directions_renderer.setOptions({preserveViewport: false});


        var bicyclist = 'images/bicyclist.png';
        camera_pin = new google.maps.Marker({
            position: start_point,
            map: map,
            icon: bicyclist
        });

        var signal_flag = 'images/signal_flag.png';
        start_pin = new google.maps.Marker({
            position: start_point,
            draggable: true,
            map: map,
            icon: signal_flag
        });

        google.maps.event.addListener(start_pin, 'dragend', function (event) {
            snapToRoad(start_pin.getPosition(), function (result) {
                start_pin.setPosition(result);
                start_point = result;
                changeHash();
            });
        });

        var signal_flag_checkered = 'images/signal_flag_checkered.png';
        end_pin = new google.maps.Marker({
            position: end_point,
            draggable: true,
            map: map,
            icon: signal_flag_checkered
        });

        google.maps.event.addListener(end_pin, 'dragend', function (event) {
            snapToRoad(end_pin.getPosition(), function (result) {
                end_pin.setPosition(result);
                end_point = result;
                changeHash();
            });
        });

        $('#mapSize').on('click', function (e) {
            var map = $("#map");
            if (map.is(':visible')) {
                $('#mapSize').fadeOut(function () {
                    $("#map").slideUp();
                    $('#mapSize').addClass('slided');
                    $('#mapSize').fadeIn();
                });
            } else {
                $('#mapSize').fadeOut(function () {
                    $("#map").slideDown();
                    $('#mapSize').removeClass('slided')
                    $('#mapSize').fadeIn();
                });
            }
        });

        $('#chartSize').on('click', function (e) {
            var chart = $("#chart");
            if (chart.is(':visible')) {
                chart.slideUp();
            } else {
                chart.slideDown();
            }
        });


        pivot_pin = new google.maps.Marker({
            position: lookat_point,
            draggable: true,
            map: map
        });

        //Hide pin for now
        pivot_pin.setMap(null);

        // google.maps.event.addListener (pivot_pin, 'dragend', function (event) {
        // 	hyperlapse.setLookat( pivot_pin.getPosition() );
        // 	changeHash();
        // });

        // function findAddress(address) {
        // 	geocoder.geocode( { 'address': address}, function(results, status) {
        // 		if (status == google.maps.GeocoderStatus.OK) {
        // 			map.setCenter(results[0].geometry.location);
        // 			o.drop_pins();
        // 		} else {
        // 			show( "Geocode was not successful for the following reason: " + status );
        // 		}
        // 	});
        // }

        // var search = document.getElementById( 'searchButton' );
        // search.addEventListener( 'click', function( event ) {
        // 	event.preventDefault();
        // 	findAddress( document.getElementById("address").value );
        // }, false );


        /* Hyperlapse */

        var pano = document.getElementById('pano');
        var is_moving = false;
        var px, py;
        var onPointerDownPointerX = 0, onPointerDownPointerY = 0;

        var hyperlapse = new Hyperlapse(pano, {
            lookat: lookat_point,
            fov: 80,
            millis: 200,
            width: window.innerWidth,
            height: window.innerHeight,
            zoom: 2,
            use_lookat: false,
            distance_between_points: 5,
            max_points: 1000,
            elevation: _elevation,
            use_elevation: true
        });


        hyperlapse.onError = function (e) {
            show("ERROR: " + e.message);
        };

        hyperlapse.onRouteProgress = function (e) {
            _route_markers.push(new google.maps.Marker({
                    position: e.point.location,
                    draggable: false,
                    icon: "images/dot_marker.png",
                    map: map
                })
            );
        };

        hyperlapse.onRouteComplete = function (e) {

            show("Number of Points: " + hyperlapse.length());
            hyperlapse.load();

            var arrayCount = 0;
            var baseData = e.points.map(function (obj) {
                var rObj = {};
                rObj.frame = arrayCount;
                rObj.elevation = +obj.elevation.toFixed(1);
                rObj.location = obj.location;
                arrayCount++;
                return rObj;
            });


            var altData =  JSON.parse(JSON.stringify(baseData));




            for(i=0; i<altData.length; i++) {

                if(i==0){

                    altData[i].y = altData[i].elevation;
                    //slopetData[i].y = '';

                    altData[i].x = 0;
                    //slopetData[i].x = 0;
                }else
                {

                    var dist = google.maps.geometry.spherical.computeDistanceBetween(
                            altData[i].location,
                            altData[i-1].location) + altData[i - 1].x;


                    altData[i].y = altData[i].elevation;
                    altData[i].x = +dist.toFixed(1);

                }
            }

            var slopeData =  JSON.parse(JSON.stringify(baseData));

            for(i=0; i<slopeData.length; i++) {

                if(i==0){


                    slopeData[i].y = '';
                    slopeData[i].x = 0;
                }else
                {

                    var dist = google.maps.geometry.spherical.computeDistanceBetween(
                            slopeData[i].location,
                            slopeData[i-1].location) + slopeData[i - 1].x;

                    var change_in_height =  slopeData[i].elevation - slopeData[i -1].elevation;

                    var slope =  change_in_height / dist;

                    slopeData[i].y = slope;
                    slopeData[i].x = dist;
                }
            }


            // Wrapping in nv.addGraph allows for '0 timeout render', stores rendered charts in nv.graphs, and may do more in the future... it's NOT required
            var chart;
            var data;

            d3.select("#chart svg").remove();
            d3.select("#chart").html('');

            nv.addGraph(function () {



                chart = nv.models.lineChart()
                    .options({
                        transitionDuration: 300,
                        useInteractiveGuideline: true
                    });
                // chart sub-models (ie. xAxis, yAxis, etc) when accessed directly, return themselves, not the parent chart, so need to chain separately
                // chart.xAxis.axisLabel("Frames");
                chart.yAxis.axisLabel('Height M');
                chart.xAxis.axisLabel('Approx Distance');

                chart.lines.dispatch.on("elementClick", function (e) {
                    console.log(e[0].pointIndex);

                    hyperlapse.gotoFrame(e[0].pointIndex);
                });


                chart.showLegend(false);

                d3.select('#chart').append('svg')
                    .datum([
                        {
                            values: altData
                        }
                        //, {
                        //    values: slopeData
                        //}
                    ])
                    .call(chart);
                nv.utils.windowResize(chart.update);
                return chart;
            });


        };

        hyperlapse.onLoadProgress = function (e) {
            show("Loading: " + (e.position + 1) + " of " + hyperlapse.length());
        };

        hyperlapse.onLoadComplete = function (e) {
            hyperlapse.resetFrames();

        };

        hyperlapse.onFrame = function (e) {
            show(
                "Position: " + (e.position + 1) + " of " + hyperlapse.length());
            camera_pin.setPosition(e.point.location);


            // removeClass
            $('.nv-point').attr('class', function (index, classNames) {
                return classNames.replace('hover', '');
            });

            // addClass
            $('.nv-point-' + (e.position)).attr('class', function (index, classNames) {
                return classNames + ' hover';
            });


        }

        pano.addEventListener('mousedown', function (e) {
            e.preventDefault();

            is_moving = true;

            onPointerDownPointerX = e.clientX;
            onPointerDownPointerY = e.clientY;

            px = hyperlapse.position.x;
            py = hyperlapse.position.y;

        }, false);

        pano.addEventListener('mousemove', function (e) {
            e.preventDefault();
            var f = hyperlapse.fov() / 500;

            if (is_moving) {
                var dx = ( onPointerDownPointerX - e.clientX ) * f;
                var dy = ( e.clientY - onPointerDownPointerY ) * f;
                hyperlapse.position.x = px + dx; // reversed dragging direction (thanks @mrdoob!)
                hyperlapse.position.y = py + dy;

                o.position_x = hyperlapse.position.x;
                o.position_y = hyperlapse.position.y;
            }

        }, false);

        pano.addEventListener('mouseup', function () {
            is_moving = false;

            hyperlapse.position.x = px;
            //hyperlapse.position.y = py;
        }, false);


        /* Dat GUI */

        var gui = new dat.GUI();

        var o = {
            distance_between_points: 5,
            max_points: 1000,
            fov: 80,
            elevation: Math.floor(_elevation),
            tilt: 0,
            millis: 50,
            offset_x: 0,
            offset_y: 0,
            offset_z: 0,
            position_x: 0,
            position_y: 0,
            use_lookat: false,
            screen_width: window.innerWidth,
            screen_height: window.innerHeight,
            generate: function () {
                show("Generating route...");

                directions_renderer.setDirections({routes: []});

                var marker;
                while (_route_markers.length > 0) {
                    marker = _route_markers.pop();
                    marker.setMap(null);
                }

                request = {
                    origin: start_point,
                    destination: end_point,
                    travelMode: google.maps.DirectionsTravelMode.DRIVING
                };

                directions_service.route(request, function (response, status) {
                    if (status == google.maps.DirectionsStatus.OK) {
                        directions_renderer.setDirections(response);
                        hyperlapse.generate({route: response});
                    } else {
                        console.log(status);
                    }
                })


            },
            drop_pins: function () {
                var bounds = map.getBounds();
                var top_left = bounds.getNorthEast();
                var bot_right = bounds.getSouthWest();
                var hdif = Math.abs(top_left.lng() - bot_right.lng());
                var spacing = hdif / 4;

                var center = map.getCenter();
                var c1 = new google.maps.LatLng(center.lat(), center.lng() - spacing);
                var c2 = new google.maps.LatLng(center.lat(), center.lng());
                var c3 = new google.maps.LatLng(center.lat(), center.lng() + spacing);


                hyperlapse.lookat = c2;
                pivot_pin.setPosition(c2);


                snapToRoad(c1, function (result1) {
                    start_pin.setPosition(result1);
                    start_point = result1;

                    snapToRoad(c3, function (result3) {
                        end_pin.setPosition(result3);
                        end_point = result3;
                        changeHash();
                    });
                });
            }
        };


        var scn = gui.addFolder('screen');
        scn.add(o, 'screen_width', window.innerHeight).listen();
        scn.add(o, 'screen_height', window.innerHeight).listen();

        var parameters = gui.addFolder('parameters');

        var distance_between_points_control = parameters.add(o, 'distance_between_points', 5, 100);
        distance_between_points_control.onChange(function (value) {
            hyperlapse.setDistanceBetweenPoint(value);
        });

        var max_points = parameters.add(o, 'max_points', 10, 1000);
        max_points.onChange(function (value) {
            hyperlapse.setMaxPoints(value);
        });

        var fov_control = parameters.add(o, 'fov', 1, 180);
        fov_control.onChange(function (value) {
            hyperlapse.setFOV(value);
        });

        var pitch_control = parameters.add(o, 'elevation', -1000, 1000);
        pitch_control.onChange(function (value) {
            _elevation = value;
            hyperlapse.elevation_offset = value;
            changeHash();
        });

        var millis_control = parameters.add(o, 'millis', 10, 5000);
        millis_control.onChange(function (value) {
            hyperlapse.millis = value;
        });

        var offset_x_control = parameters.add(o, 'offset_x', -360, 360);
        offset_x_control.onChange(function (value) {
            hyperlapse.offset.x = value;
        });

        var offset_y_control = parameters.add(o, 'offset_y', -180, 180);
        offset_y_control.onChange(function (value) {
            hyperlapse.offset.y = value;
        });

        var offset_z_control = parameters.add(o, 'offset_z', -360, 360);
        offset_z_control.onChange(function (value) {
            hyperlapse.offset.z = value;
        });

        var position_x_control = parameters.add(o, 'position_x', -360, 360).listen();
        position_x_control.onChange(function (value) {
            hyperlapse.position.x = value;
        });

        var position_y_control = parameters.add(o, 'position_y', -180, 180).listen();
        position_y_control.onChange(function (value) {
            hyperlapse.position.y = value;
        });

        var tilt_control = parameters.add(o, 'tilt', -Math.PI, Math.PI);
        tilt_control.onChange(function (value) {
            hyperlapse.tilt = value;
        });

        var lookat_control = parameters.add(o, 'use_lookat')
        lookat_control.onChange(function (value) {
            hyperlapse.use_lookat = value;
        });


        parameters.open();


        var play_controls = gui.addFolder('play controls');
        play_controls.add(hyperlapse, 'play');
        play_controls.add(hyperlapse, 'pause');
        play_controls.add(hyperlapse, 'next');
        play_controls.add(hyperlapse, 'prev');
        play_controls.add(hyperlapse, 'last');
        play_controls.add(hyperlapse, 'resetFrames');

        play_controls.open();


        $('.play').on('click', function (e) {
            hyperlapse.play();
            $('.play').hide();
            $('.pause').show();

        });
        $('.pause').on('click', function (e) {
            hyperlapse.pause();
            $('.pause').hide();
            $('.play').show();

        });
        $('.next').on('click', function (e) {
            hyperlapse.next();
        });
        $('.prev').on('click', function (e) {
            hyperlapse.prev();
        });
        $('.start').on('click', function (e) {
            hyperlapse.resetFrames();
        });
        $('.end').on('click', function (e) {
            hyperlapse.last();
        });

        gui.add(o, 'drop_pins');

        var generate = gui.add(o, 'generate');
        generate.onChange(function (value) {
            $('#Chart').empty();


        });

        var play_controls = gui.addFolder('route controls');

        play_controls.add(hyperlapse, 'load');


        window.addEventListener('resize', function () {
            hyperlapse.setSize(window.innerWidth, window.innerHeight);
            o.screen_width = window.innerWidth;
            o.screen_height = window.innerHeight;
        }, false);


        gui.close();

        var show_ui = true;
        document.addEventListener('keydown', onKeyDown, false);
        function onKeyDown(event) {

            switch (event.keyCode) {
                case 72: /* H */
                    show_ui = !show_ui;
                    document.getElementById("controls").style.opacity = (show_ui) ? 1 : 0;
                    break;

                case 190: /* > */
                    hyperlapse.next();
                    break;

                case 188: /* < */
                    hyperlapse.prev();
                    break;
            }

        };

        o.generate();
    }

    window.onload = init;

});
