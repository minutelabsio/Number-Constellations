define(
    [
        'jquery',
        'moddef',
        'kinetic',
        'hammer',
        'dat',
        'math',
        'modules/sequences',
        'modules/spirals'
    ],
    function(
        $,
        M,
        Kinetic,
        Hammer,
        dat,
        mathjs,
        Sequences,
        Spirals
    ) {

        'use strict';

        var math = mathjs();

        var DEFAULTS = {
          "preset": "Default",
          "closed": false,
          "remembered": {
            "Default": {
              "0": {
                "Layout": "ulamSpiral",
                "Family": "primes",
                "custom": "n^2",
                "connect": false,
                "highlight": "#a33"
              }
            }
          },
          "folders": {}
        };

        function sign( x ){
            return x >= 0 ? 1 : -1;
        }

        function mathParse( expr ){

            var scope = {
                    n: 0
                }
                ,node
                ,fn
                ;
        
            node = math.parse( expr );
            fn = node.compile( math );
            
            return function( n ){
                scope.n = n + 1;
                return fn.eval( scope );
            };
        }

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

                self.markers = [];

                self.setLayout = self.nonBlocking(self.setLayout);
                self.highlightSequence = self.nonBlocking(self.highlightSequence);

                $(function(){
                    self.resolve('domready');
                });

                self.after('domready').then(function(){
                    self.onDomReady();
                });

                self.initEvents();
                self.initStage();
                self.initSettings();
            },

            nonBlocking: function( fn ){

                var self = this
                    ,complete
                    ;

                complete = function( args ){
                    fn.apply( self, args );
                    self.emit( 'progress', false );
                };
                return function(){
                    self.emit( 'progress', true );
                    _.defer( complete, arguments );
                };
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
                        zoom += Math.min(Math.abs(ev.wheelDelta) / 50, 0.2) * sign(ev.wheelDelta);
                        eventData.scale = zoom;//ev.wheelDelta;
                        self.zoom = zoom;
                        
                        // trigger transform event
                        hammertime.trigger("transform", eventData);
                        self.emit('zoom', zoom);
                        
                        // prevent scrolling
                        ev.preventDefault();
                    });
                });

                self.on('refresh-layout', function(){
                    // refresh highlight when layout changed
                    self.highlightSequence( true );
                });
            },

            initSettings: function(){

                var self = this
                    ,gui = new dat.GUI({ load: DEFAULTS })
                    ,settings
                    ;

                settings = {
                    _layout: 'ulamSpiral'
                    // layout
                    ,get Layout (){
                        return this._layout;
                    }
                    ,set Layout ( val ){
                        this._layout = val;
                        this._layoutArr = Spirals[ val ]( 10000 );
                        self.setLayout( this._layoutArr );
                    }
                    // family
                    ,_family: 'primes'
                    ,get Family (){
                        return this._family;
                    }
                    ,set Family( val ){
                        this._family = val;
                        if ( val === 'custom' ){
                            try {
                                this._familyArr = _.times( 10000, mathParse( this._custom ) );
                            } catch ( e ){
                                return;
                            }
                        } else {
                            this._familyArr = Sequences[ val ]( 10000 );
                        }
                        
                        self.highlightSequence( this._familyArr, this._highlight );
                    }
                    // custom
                    ,_custom: 'n^2'
                    ,get custom(){
                        return this._custom;
                    }
                    ,set custom( val ){
                        this._custom = val;
                        if ( this.Family === 'custom' ){
                            this.Family = this.Family;
                        }
                    }
                    // connect the dots?
                    ,connect: false
                    // highlight color
                    ,_highlight: '#a33'
                    ,get highlight (){
                        return this._highlight;
                    }
                    ,set highlight ( val ){
                        this._highlight = val;
                        self.highlightSequence( this._familyArr, this._highlight );
                    }
                };

                gui.remember(settings);

                gui.add(settings, 'Layout', {
                    'Ulam Spiral': 'ulamSpiral'
                    ,'Sacks Spiral': 'sacksSpiral'
                    ,'Vogel Spiral': 'vogelSpiral'
                });

                gui.add(settings, 'Family', {
                    'Primes': 'primes'
                    ,'Fibonacci Numbers': 'fibonaccis'
                    ,'Custom Function': 'custom'
                });

                gui.add(settings, 'custom');

                gui.add(settings, 'connect');

                gui.addColor(settings, 'highlight');
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
                }, 400);

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

                self.on('refresh-highlight', refresh);
            },

            setLayout: function( layout ){

                var self = this
                    ,coords
                    ,symb
                    ,size = 20
                    ,r = size * 0.5
                    ,x
                    ,y
                    ;

                if ( layout === self.layout ){
                    // no change
                    return;
                }

                self.layout = layout;
                self.mainGroup.destroyChildren();
                self.markers.length = 0;

                for ( var i = 0, l = layout.length; i < l; ++i ){
                    
                    coords = layout[ i ];
                    x = coords[0] * size;
                    y = -coords[1] * size;
                    
                    symb = new Kinetic.Circle({
                        x: x,
                        y: y,
                        width: size - 2,
                        height: size - 2,
                        fill: '#ccc'
                    });

                    self.markers.push( symb );
                    self.mainGroup.add( symb );

                    if ( i < 99 ){
                        symb = new Kinetic.Text({
                            x: x,
                            y: y,
                            width: size,
                            height: size,
                            text: (i + 1) + '',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            fill: 'rgba(20, 20, 20, 0.3)',
                            align: 'center',
                            offset: {
                                x: size/2,
                                y: (size - 8)/2
                            }
                        });

                        self.mainGroup.add( symb );
                    } 
                }

                self.emit('refresh-layout');
            },

            highlightSequence: function( seq, color ){

                var self = this
                    ,markers = this.markers
                    ,m
                    ,pos
                    ,i
                    ,l
                    ;

                if ( seq !== true && seq === self.sequence && self.highlightColor === color ){
                    // no change
                    return;
                }

                if ( self.sequence && seq !== self.sequence ){
                    // reset the colors to default
                    for ( i = 0, l = markers.length; i < l; ++i ){
                        markers[ i ].fill( '#ccc' );
                    }
                }

                if ( seq === true ){
                    // force refresh with same values
                    seq = self.sequence;
                    color = self.highlightColor;
                } else {
                    self.sequence = seq;
                    self.highlightColor = color || '#a33';
                }

                if ( !seq ){
                    // no sequence set yet
                    return;
                }

                for ( i = 0, l = seq.length; i < l; ++i ){
                    
                    pos = seq[ i ] - 1;
                    m = markers[ pos ];
                    if ( !m ){
                        break;
                    }

                    m.fill( color );
                }

                self.emit('refresh-highlight');
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




