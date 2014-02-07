define(
    [
        'jquery',
        'moddef',
        'kinetic',
        'hammer',
        'modules/sequences',
        'modules/spirals'
    ],
    function(
        $,
        M,
        Kinetic,
        Hammer,
        Sequences,
        Spirals
    ) {

        'use strict';

        /**
         * Page-level Mediator
         * @module Boilerplate
         * @implements {Stapes}
         */
        var Mediator = M({

            /**
             * Mediator Constructor
             * @return {void}
             */
            constructor : function(){

                var self = this;

                $(function(){
                    self.resolve('domready');
                });

                self.after('domready').then(function(){
                    self.onDomReady();
                });

                self.initEvents();
                self.initStage();
                self.drawNumbers();
            },

            /**
             * Initialize events
             * @return {void}
             */
            initEvents : function(){

                var self = this
                    ,zoom = 0
                    ;

                self.zoom = zoom;

                self.after('domready').then(function(){

                    var hammertime = Hammer( self.el ).on("mousewheel", function(ev) { 
                        // create some hammerisch eventData
                        var eventType = 'scroll';
                        var touches   = Hammer.event.getTouchList(ev, eventType);
                        var eventData = Hammer.event.collectEventData(this, eventType, touches, ev);
                        
                        // you should calculate the zooming over here, 
                        // should be something like wheelDelta * the current scale level, or something...
                        zoom += ev.wheelDelta / 50;
                        eventData.scale = zoom;//ev.wheelDelta;
                        self.zoom = zoom;
                        
                        // trigger transform event
                        hammertime.trigger("transform", eventData);
                        self.emit('zoom', zoom);
                        
                        // prevent scrolling
                        ev.preventDefault();
                    });
                });
            },

            initStage: function(){

                var self = this
                    ,stage
                    ,mainLayer
                    ,mainGroup
                    ,scale = 1
                    ,$win = $(window)
                    ,w = $win.width()
                    ,h = $win.height()
                    ,el = document.createElement('div')
                    ;

                stage = self.stage = new Kinetic.Stage({ container: el });
                mainLayer = self.mainLayer = new Kinetic.Layer();
                mainGroup = self.mainGroup = new Kinetic.Group();
                mainLayer.add( mainGroup );
                stage.add( mainLayer );
                
                var uncache = _.debounce(function(){
                    mainGroup.cache({
                            x: 0,
                            y: 0,
                            width: w,
                            height: h
                        })
                        .offset({
                            x: w/2,
                            y: h/2
                        })
                        .scaleX( 1/scale )
                        .scaleY( 1/scale )
                        ;
                }, 200);

                function refresh( nocache ){

                    stage.setWidth( w );
                    stage.setHeight( h );
                    mainLayer.offsetX( -w/2/scale );
                    mainLayer.offsetY( -h/2/scale );
                    mainLayer.scale({
                        x: scale,
                        y: scale
                    });
                    stage.batchDraw();

                    if ( nocache !== false ){
                        uncache();
                    }
                }

                // window resizing
                $win.on('resize', function(){
                    w = $win.width();
                    h = $win.height();
                    refresh();
                });

                self.on('zoom', function( e, zoom ){
                    scale = Math.pow(2, zoom);
                    refresh();
                });

                self.after('domready').then(function(){

                    self.$el.append( el );
                    refresh( false );
                });
            },

            drawNumbers: function(){

                var self = this
                    ,spiral = Spirals.ulamSpiral( 10000 )
                    ,seq = Sequences.primes( 10000 )
                    ,coords
                    ,symb
                    ,color
                    ,size = 20
                    ,r
                    ;


                // self.mainLayer.clearCache();
                for ( var i = 0, l = spiral.length; i < l; ++i ){
                    
                    coords = spiral[ i ];
                    color = (seq.indexOf( i + 1 ) > -1) ? '#a33' : '#ccc';

                    if ( i < 25 ){
                        symb = new Kinetic.Text({
                            x: coords[0] * size,
                            y: coords[1] * size,
                            offsetY: -(size - 12) * 0.5,
                            width: size,
                            height: size,
                            text: (i + 1) + '',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            fill: color,
                            align: 'center'
                        });
                    } else {
                        r = size * 0.5;
                        symb = new Kinetic.Circle({
                            x: coords[0] * size,
                            y: coords[1] * size,
                            offset: {
                                x: -r,
                                y: -r
                            },
                            width: size - 2,
                            height: size - 2,
                            fill: color
                        });
                    }

                    self.mainGroup.add( symb );
                }

                self.emit('zoom', 0);
            },

            /**
             * DomReady Callback
             * @return {void}
             */
            onDomReady : function(){

                var self = this;
                self.$el = $('#canvas-wrap');
                self.el = self.$el[0];

            }

        }, ['events']);

        return new Mediator();
    }
);




