define(
    [
        'jquery',
        'moddef',
        'kinetic',
        'hammer',
        'dat',
        'math',
        'when',
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
        when,
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
                "Limit": 10000,
                "Family": "primes",
                "custom": "n^2",
                "connect": false,
                "highlight": "rgb(167, 42, 34)"
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
                self.labels = [];

                self.minZoom = 5;
                self.maxZoom = -5;
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

            nonBlocking: function( fn, time ){

                var self = this
                    ,complete
                    ,cb
                    ,dfd
                    ;

                time = time || 50;

                cb = function( args ){
                    fn.apply( self, args );
                    if ( dfd ){
                        dfd.resolve();
                    }
                    dfd = false;
                    self.emit( 'progress', false );
                };

                complete = _.debounce(function(){
                    self.emit( 'progress', true );
                    _.defer( cb, arguments );
                }, time);

                return function(){
                    dfd = dfd || when.defer();
                    complete.apply(self, arguments);
                    return dfd.promise;
                };
            },

            /**
             * Initialize events
             * @return {void}
             */
            initEvents : function(){

                var self = this
                    ;

                self.zoom = 1;

                $(document)
                    .on('click', '#more-info', function(){
                        $(this).removeClass('closed');
                    })
                    .on('click', '#more-info .hide', function(){
                        $('#more-info').addClass('closed');
                        return false;
                    });

                self.after('domready').then(function(){

                    var hammertime = Hammer( self.el ).on('mousewheel', function(ev) { 
                        // create some hammerisch eventData
                        var eventType = 'scroll';
                        var touches   = Hammer.event.getTouchList(ev, eventType);
                        var eventData = Hammer.event.collectEventData(this, eventType, touches, ev);
                        
                        // you should calculate the zooming over here, 
                        // should be something like wheelDelta * the current scale level, or something...
                        self.zoom += Math.min(Math.abs(ev.wheelDelta) / 50, 0.2) * sign(ev.wheelDelta);
                        eventData.scale = self.zoom;//ev.wheelDelta;
                        
                        // trigger transform event
                        hammertime.trigger('transform', eventData);
                        
                        // prevent scrolling
                        ev.preventDefault();
                    });

                    hammertime.on('transform', function( ev ){
                        self.zoom = Math.min(self.minZoom, Math.max(self.maxZoom, ev.gesture.scale));
                        self.emit('zoom', self.zoom);
                    });

                    hammertime.on('dragstart', function( ev ){
                        self.emit('movestart');
                    });

                    hammertime.on('drag', function( ev ){
                        self.emit('move', {
                            x: ev.gesture.deltaX
                            ,y: ev.gesture.deltaY
                        });
                    });

                    hammertime.on('dragend', function( ev ){
                        self.emit('moveend');
                    });
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
                        var color = this._highlight;
                        this._layout = val;
                        this._layoutArr = Spirals[ val ]( this._limit );
                        this.refreshSequence();
                        self.sequence = this._familyArr;
                        self.setLayout( this._layoutArr ).then(function(){
                            self.highlightSequence( true, color );
                        });
                    }
                    ,_limit: 10000
                    ,get Limit (){
                        return this._limit;
                    }
                    ,set Limit ( val ){
                        if ( this._limit !== val ){
                            this._limit = val;
                            this.refreshSequence();
                            self.sequence = this._familyArr;
                            this.Layout = this.Layout;
                        }
                    }
                    // family
                    ,_family: 'primes'
                    ,get Family (){
                        return this._family;
                    }
                    ,set Family( val ){
                        this._family = val;
                        this.refreshSequence();
                        self.highlightSequence( this._familyArr, this._highlight );
                    }
                    ,refreshSequence: function(){
                        var val = this._family;
                        if ( val === 'custom' ){
                            try {
                                this._familyArr = _.times( this._limit, mathParse( this._custom ) );
                            } catch ( e ){
                                return;
                            }
                        } else {
                            var fn = Sequences[ val ];
                            if ( _.isFunction( fn ) ){
                                this._familyArr = fn( this._limit );
                            } else {
                                this._familyArr = fn;
                            }
                        }
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
                    'Grid': 'grid'
                    ,'Ulam Spiral': 'ulamSpiral'
                    ,'Sacks Spiral': 'sacksSpiral'
                    ,'Vogel Spiral': 'vogelSpiral'
                });

                gui.add(settings, 'Limit', [10, 1e2, 1e3, 1e4, 5e4, 1e5]);

                gui.add(settings, 'Family', {
                    'Primes': 'primes'
                    ,'Fibonacci Numbers': 'fibonaccis'
                    ,'Vampire Numbers': 'vampire'
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
                    ,scale = Math.pow(2, self.zoom)
                    ,$win = $(window)
                    ,w = $win.width()
                    ,h = $win.height()
                    ,offset = { x: -w/2, y: -h/2 }
                    ,pos = { x: w/2/scale, y: h/2/scale }
                    ,el = document.createElement('div')
                    ;

                stage = self.stage = new Kinetic.Stage({ container: el });
                mainLayer = self.mainLayer = new Kinetic.Layer();
                mainGroup = self.mainGroup = new Kinetic.Group();
                mainLayer.add( mainGroup );
                stage.add( mainLayer );
                
                var cache = _.debounce(function(){
                    var invScale = 1/scale;
                    pos.x += offset.x * invScale;
                    pos.y += offset.y * invScale;
                    mainGroup.cache({
                            x: pos.x,
                            y: pos.y,
                            width: w,
                            height: h
                        })
                        .offsetX( w/2 )
                        .offsetY( h/2 )
                        .scaleX( 1 * invScale )
                        .scaleY( 1 * invScale )
                        ;

                    offset.x = 0;
                    offset.y = 0;
                    
                    self.emit('redraw');
                }, 400);

                function refresh(){

                    stage.setWidth( w );
                    stage.setHeight( h );
                    mainGroup.offsetX( offset.x + w/2 );
                    mainGroup.offsetY( offset.y + h/2 );
                    mainLayer.offsetX( -w/2/scale );
                    mainLayer.offsetY( -h/2/scale );
                    mainLayer.scale({
                        x: scale,
                        y: scale
                    });
                    stage.batchDraw();
                    cache();
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

                self.on('movestart', function(){
                    var old = { x: offset.x, y: offset.y }
                        ;

                    function off(){
                        self.off('moveend', off);
                        self.off('move', move);
                    }

                    function move( e, delta ){
                        offset.x = ( old.x - delta.x );
                        offset.y = ( old.y - delta.y );
                        refresh();
                    }

                    self.on('moveend', off);
                    self.on('move', move);
                });

                self.after('domready').then(function(){

                    self.$el.append( el );
                    $win.trigger('resize');
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
                    ,i
                    ,l
                    ,markerLen = self.markers.length
                    ,labelLen = self.labels.length
                    ;

                if ( layout === self.layout ){
                    // no change
                    return;
                }

                self.layout = layout;
                // self.markers.length = 0;
                // self.mainGroup.destroyChildren();
                
                for ( i = 0, l = layout.length; i < l; ++i ){
                    
                    coords = layout[ i ];
                    x = coords[0] * size;
                    y = -coords[1] * size;

                    if ( i < markerLen ){
                        
                        symb = self.markers[ i ];
                        symb.x( x );
                        symb.y( y );
                        symb.show();
                        symb.fill( '#ccc' );

                    } else {
                    
                        symb = new Kinetic.Circle({
                            x: x,
                            y: y,
                            width: size - 2,
                            height: size - 2,
                            fill: '#ccc'
                        });

                        self.markers.push( symb );
                        self.mainGroup.add( symb );
                    }

                    if ( i < 99 ){
                        if ( i < labelLen ){

                            symb = self.labels[ i ];
                            symb.x( x );
                            symb.y( y );

                        } else {

                            symb = new Kinetic.Text({
                                x: x,
                                y: y,
                                width: size,
                                height: size,
                                text: (i + 1) + '',
                                fontSize: 12,
                                fontFamily: 'monospace',
                                fill: 'rgba(20, 20, 20, 0.5)',
                                align: 'center',
                                offset: {
                                    x: size/2,
                                    y: (size - 8)/2
                                }
                            });

                            self.labels.push( symb );
                            self.mainGroup.add( symb );
                        }
                    }
                }

                for ( i = l; i < markerLen; ++i ){
                    
                    symb = self.markers[ i ];
                    symb.hide();
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
                    color = color || self.highlightColor;
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

                var self = this
                    ,$progress = $('#progress')
                    ;
                self.$el = $('#canvas-wrap');
                self.el = self.$el[0];

                self.on('progress', function( e, active ){
                    $progress.toggle( active );
                });

                self.on('redraw', function(){
                    $progress.hide();
                });
            }

        }, ['events']);

        return new Mediator();
    }
);




