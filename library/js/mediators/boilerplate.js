define(
    [
        'jquery',
        'moddef',
        'kinetic',
        'hammer.jquery',
        'mousetrap',
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
        _Hammer,
        Mousetrap,
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

                self.maxScale = 20;
                self.minScale = 0.01;
                self.scale = 1;
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

                time = time || 200;

                cb = function( args ){
                    fn.apply( self, args );
                    if ( dfd ){
                        dfd.resolve();
                    }
                    dfd = false;
                    // self.emit( 'progress', false );
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
                    ,scale = self.scale
                    ,lastScale
                    ;

                function scaleEvent(){
                    scale = Math.max(self.minScale, Math.min(self.maxScale, scale))
                    self.emit('scale', scale);
                }

                self.after('domready').then(function(){

                    var hammertime = $('#viewport').hammer();

                    hammertime.on('mousewheel', '#canvas-wrap', function( ev ) { 
                        var zoom = Math.min(Math.abs(ev.originalEvent.wheelDelta) / 50, 0.2) * sign(ev.originalEvent.wheelDelta);
                        scale *= Math.pow(2, zoom);
                        scaleEvent();
                        ev.preventDefault();
                    });

                    hammertime.on('transformstart', '#canvas-wrap', function( ev ){
                        lastScale = scale;
                    });

                    hammertime.on('transform', '#canvas-wrap', function( ev ){
                        scale = lastScale * ev.gesture.scale;
                        scaleEvent();
                        ev.preventDefault();
                    });

                    hammertime.on('dragstart', '#canvas-wrap', function( ev ){
                        self.emit('movestart');
                    });

                    hammertime.on('drag', '#canvas-wrap', function( ev ){
                        self.emit('move', {
                            x: ev.gesture.deltaX
                            ,y: ev.gesture.deltaY
                        });
                    });

                    hammertime.on('dragend', '#canvas-wrap', function( ev ){
                        self.emit('moveend');
                    });

                    hammertime.on('tap', '#more-info', function(){
                            $(this).toggleClass('closed');
                        })
                        .on('tap', '#more-info .hide', function(){
                            $('#more-info').addClass('closed');
                            return false;
                        })
                        ;
                });

                Mousetrap.bind('command+=', function(){
                    scale *= 2;
                    scaleEvent();
                    return false;
                });

                Mousetrap.bind('command+-', function(){
                    scale *= 0.5;
                    scaleEvent();
                    return false;
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
                        var con = this._connect;
                        this._layout = val;
                        this._layoutArr = Spirals[ val ]( this._limit );
                        this.refreshSequence();
                        self.sequence = this._familyArr;
                        self.setLayout( this._layoutArr ).then(function(){
                            return self.highlightSequence( true, color, con );
                        }).then(function(){
                            self.emit('refresh');
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
                        self.highlightSequence( this._familyArr, this._highlight, this._connect, this._weighted ).then(function(){
                            self.emit('refresh');
                        });
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

                        if ( val === 'fibonacciSums' ){
                            this._weighted = true;
                        } else {
                            this._weighted = false;
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
                    ,_connect: false
                    ,get connect(){
                        return this._connect;
                    }
                    ,set connect( val ){
                        this._connect = val;
                        self.highlightSequence( this._familyArr, this._highlight, this._connect, this._weighted ).then(function(){
                            self.emit('refresh');
                        });
                    }
                    // highlight color
                    ,_highlight: '#a33'
                    ,get highlight (){
                        return this._highlight;
                    }
                    ,set highlight ( val ){
                        this._highlight = val;
                        self.highlightSequence( this._familyArr, this._highlight, this._connect, this._weighted ).then(function(){
                            self.emit('refresh');
                        });
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
                    ,'Fibonacci Sums' : 'fibonacciSums'
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
                    ,scale = self.scale
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
                self.connectLine = new Kinetic.Line({
                    points: [0,0,100,100]
                    ,x: 0
                    ,y: 0
                    ,strokeWidth: 2
                });
                mainGroup.add( self.connectLine );
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
                    stage.draw();
                    self.emit('redraw');
                    self.emit( 'progress', false );
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

                self.on('scale', function( e, s ){
                    scale = s;
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

                self.on('refresh', refresh);

                self.after('domready').then(function(){

                    self.$el.append( el );
                    $win.trigger('resize');
                });
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

                // hide unneeded markers
                for ( i = l; i < markerLen; ++i ){
                    
                    symb = self.markers[ i ];
                    symb.hide();
                }

                self.emit('refresh-layout');
            },

            highlightSequence: function( seq, color, connect, weighted ){

                var self = this
                    ,markers = this.markers
                    ,m
                    ,pos
                    ,i
                    ,l
                    ,w
                    ,line = []
                    ;

                if ( seq !== true && 
                    seq === self.sequence && 
                    self.highlightColor === color && 
                    self.connectLine.visible() === (!!connect) 
                ){
                    // no change
                    return;
                }

                if ( self.sequence && seq !== self.sequence ){
                    // reset the colors to default
                    for ( i = 0, l = markers.length; i < l; ++i ){
                        markers[ i ]
                            .fill( '#ccc' )
                            .opacity( 1 )
                            ;
                    }
                }

                if ( seq === true ){
                    // force refresh with same values
                    seq = self.sequence;
                    weighted = self.weighted;
                    color = color || self.highlightColor;
                    connect = self.connectLine.visible();
                } else {
                    self.sequence = seq;
                    self.weighted = weighted;
                    self.highlightColor = color || '#a33';
                    self.connectLine.visible( !!connect );
                }

                if ( !seq ){
                    // no sequence set yet
                    return;
                }

                if ( weighted ){
                    w = 1 / _.max(seq);
                    // highlight by weight
                    for ( i = 0, l = seq.length; i < l; ++i ){
                    
                        pos = seq[ i ]; // weight
                        m = markers[ i ];
                        if ( !m ){
                            break;
                        }

                        m.fill( color );
                        m.opacity( pos * w );
                    }

                    self.connectLine.points( [] );

                } else {
                    // highlight the numbers in the sequence
                    for ( i = 0, l = seq.length; i < l; ++i ){
                        
                        pos = seq[ i ] - 1;
                        m = markers[ pos ];
                        if ( !m ){
                            break;
                        }

                        m.fill( color );
                        if ( connect ){
                            line.push( m.x(), m.y() );
                        }
                    }

                    self.connectLine
                        .points( line )
                        .stroke( self.highlightColor )
                        .moveToTop()
                        ;

                    _.each(self.labels, function( node ){
                        node.moveToTop();
                    });
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
                    self.$el.toggleClass('loading', active);
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




