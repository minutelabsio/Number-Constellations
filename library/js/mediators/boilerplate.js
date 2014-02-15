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
                "highlight": "rgb(167, 42, 34)",
                "zoom to": 1
              }
            }
          },
          "folders": {}
        };

        var familyList = {
            'Primes Numbers': 'primes'
            ,'Carmichael': 'carmichael'
            ,'Fibonacci Numbers': 'fibonaccis'
            ,'Fibonacci Primes': 'fibonacciPrimes'
            ,'Fibonacci Sums' : 'fibonacciSums'
            ,'Pythagorean Primes': 'pythPrimes'
            ,'Pythagorean Triples': 'pythTriples'
            ,'Vampire Numbers': 'vampire'
            ,'Largest Metadromes in base n': 'metadromes'
            ,'Random': 'randoms'
            ,'Random (weighted)': 'randomsWeighted'
            ,'Custom Function': 'custom'
        };

        var familyNames = _.invert( familyList );

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
                self.offset = { x: 0, y: 0 };
                self.selected = 1;
                self.setLayout = self.nonBlocking(self.setLayout);
                self.highlightSequence = self.nonBlocking(self.highlightSequence);
                self.clickCallback = self.clickCallback.bind(this);

                self.restoreHash();

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

            restoreHash: function(){
                var self = this
                    ,hash = window.location.hash.substr(1)
                    ;
                // find settings
                hash = hash.match(/settings=([^&]*)/);

                if ( !hash || !hash.length ){
                    return;
                }

                // decode
                try {
                    hash = window.atob(window.decodeURIComponent(hash[1]));
                    hash = $.parseJSON(hash);
                } catch( e ){
                    return;
                }

                if ( !hash ){
                    return;
                }

                if ( hash.gui ){
                    self.guiSharePreset = hash.gui;
                }

                if ( hash.scale ){
                    self.scale = hash.scale;
                }

                if ( hash.offset ){
                    self.offset = hash.offset;
                }

                if ( hash.selected ){
                    self.selected = hash.selected;
                }
            },

            updateHash: function(){
                var self = this
                    ,obj = self.gui.getSaveObject()
                    ,preset = obj.preset
                    ,vals = obj.remembered[ preset ]
                    ,hash = {
                        gui: vals[0]
                        ,scale: self.scale
                        ,offset: self.offset
                        ,selected: parseInt(self.$number.text())
                    }
                    ;
                
                window.location.hash = '#settings=' + window.encodeURIComponent(window.btoa(JSON.stringify(hash)));
            },

            getPresets: function(){
                var self = this
                    ,shared = self.guiSharePreset ? { preset: 'shared', remembered: { shared: {'0': self.guiSharePreset } } } : null
                    ;
                
                return $.extend(true, {}, DEFAULTS, shared);
            },

            clickCallback: function( e ){
                this.emit('clicked', e.targetNode);
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
                    ,lastScale
                    ;

                function scaleEvent(){
                    self.scale = Math.max(self.minScale, Math.min(self.maxScale, self.scale))
                    self.emit('scale', self.scale);
                }

                self.after('domready').then(function(){

                    var hammertime = $('#viewport').hammer();

                    hammertime.on('mousewheel', '#canvas-wrap', function( ev ) { 
                        var zoom = Math.min(Math.abs(ev.originalEvent.wheelDelta) / 50, 0.2) * sign(ev.originalEvent.wheelDelta);
                        self.scale *= Math.pow(2, zoom);
                        scaleEvent();
                        ev.preventDefault();
                    });

                    hammertime.on('transformstart', '#canvas-wrap', function( ev ){
                        lastScale = self.scale;
                    });

                    hammertime.on('transform', '#canvas-wrap', function( ev ){
                        self.scale = lastScale * ev.gesture.scale;
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

                    hammertime.on('tap', '#more-info', function( e ){
                            e.preventDefault();
                            $(this).toggleClass('closed');
                            return false;
                        })
                        .on('tap', '#more-info .hide', function( e ){
                            e.preventDefault();
                            $('#more-info').addClass('closed');
                            return false;
                        })
                        .on('tap', '#what-is-this', function( e ){
                            e.preventDefault();
                            self.emit('describe', 'what');
                            return false;
                        })
                        .on('tap', '#back-to', function( e ){
                            e.preventDefault();
                            self.emit('describe', familyList[$(this).attr('data-about')]);
                            return false;
                        })
                        ;

                    self.on('hash', self.updateHash, self);
                });

                self.on('zoomin', function(){
                    self.scale *= 2;
                    scaleEvent();
                });

                self.on('zoomout', function(){
                    self.scale *= 0.5;
                    scaleEvent();
                });

                Mousetrap.bind('command+=', function(){
                    self.emit('zoomin');
                    return false;
                });

                Mousetrap.bind('command+-', function(){
                    self.emit('zoomout');
                    return false;
                });

                // one off
                // highlight the selected node after
                // first render
                self.on('refresh-highlight', function( e ){
                    var node = self.stage.find('#circle-'+self.selected)[0];
                    self.emit('clicked', node);
                    self.off(e.topic, e.handler);
                });

                self.on('describe', function( e, type ){
                    self.after('domready').then(function(){
                        var $el = $('#describe-'+type);
                        $('#what-is-this').toggle( type !== 'what' );
                        if ( $el.length ){
                            $('#more-info .content > div').hide();
                            $el.show();
                        }
                        if ( type !== 'what' ){
                            $('#back-to').attr('data-about', familyNames[type]);
                        }
                    });
                });
            },

            initSettings: function(){

                var self = this
                    ,gui = new dat.GUI({ load: self.getPresets() })
                    ,settings
                    ,weightedSeqs = ['fibonacciSums', 'khintchine', 'randomsWeighted']
                    ,updateHash = function(){
                        self.emit('hash');
                    }
                    ;

                self.gui = gui;

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
                        self.emit('describe', val);
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
                                this._familyArr = [];
                                return;
                            }
                        } else if ( val === 'randomsWeighted' ){

                            this._familyArr = _.times( this._limit, Math.random );

                        } else {
                            var fn = Sequences[ val ];
                            if ( _.isFunction( fn ) ){
                                this._familyArr = fn( this._limit );
                            } else {
                                this._familyArr = fn;
                            }
                        }
                        
                        this._weighted = (_.indexOf(weightedSeqs, val) > -1);
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
                    // goto number
                    ,'zoom to': 42
                };

                settings['zoom in'] = function(){
                    self.emit('zoomin');
                };
                settings['zoom out'] = function(){
                    self.emit('zoomout');
                };
                settings['zoom to selected number'] = function(){
                    self.emit('goto', this.select);
                };
                
                gui.remember(settings);

                gui.add(settings, 'Layout', {
                    'Grid': 'grid'
                    ,'Ulam Spiral': 'ulamSpiral'
                    ,'Sacks Spiral': 'sacksSpiral'
                    ,'Vogel Spiral': 'vogelSpiral'
                }).onChange(updateHash);

                gui.add(settings, 'Limit', [10, 1e2, 1e3, 1e4, 5e4, 1e5]).onChange(updateHash);

                gui.add(settings, 'Family', familyList).onChange(updateHash);

                gui.add(settings, 'custom').onChange(updateHash);

                gui.add(settings, 'connect').onChange(updateHash);

                gui.addColor(settings, 'highlight').onChange(updateHash);

                var nav = gui.addFolder('Navigation');

                nav.add(settings, 'zoom in');
                nav.add(settings, 'zoom out');
                nav.add(settings, 'zoom to', 1).onChange(_.debounce(function( val ){
                    self.emit('goto', val);
                }, 100));
                nav.open();
            },

            initStage: function(){

                var self = this
                    ,el = document.createElement('div')
                    ,stage = self.stage = new Kinetic.Stage({ container: el })
                    ,mainLayer = self.mainLayer = new Kinetic.Layer()
                    ,mainGroup = self.mainGroup = new Kinetic.Group()
                    ,panGroup = self.panGroup = new Kinetic.Group()
                    ,selected
                    ,scale = self.scale
                    ,$win = $(window)
                    ,w = $win.width()
                    ,h = $win.height()
                    ,offset = self.offset
                    ;

                self.connectLine = new Kinetic.Line({
                    points: [0,0,100,100]
                    ,x: 0
                    ,y: 0
                    ,strokeWidth: 2
                });
                mainGroup.add( self.connectLine );
                panGroup.add( mainGroup );
                mainLayer.add( panGroup );
                stage.add( mainLayer );

                selected = new Kinetic.Circle({
                    x: 0
                    ,y: 0
                    ,radius: 10
                    ,fill: false
                    ,stroke: '#000'
                    ,strokeWidth: 2
                });

                panGroup.add( selected );
                
                var cache = _.debounce(function(){
                    var invScale = 1/scale;
                    
                    mainGroup.cache({
                            x: 0,
                            y: 0,
                            width: w,
                            height: h
                        })
                        .offsetX( -offset.x*scale + w/2 )
                        .offsetY( -offset.y*scale + h/2 )
                        .scaleX( invScale )
                        .scaleY( invScale )
                        ;

                    stage.draw();
                    self.emit( 'redraw' );
                    self.emit( 'progress', false );
                    self.emit( 'hash' );
                }, 400);

                function refresh( nocache ){

                    stage.setWidth( w );
                    stage.setHeight( h );
                    mainLayer.offsetX( -w/2 );
                    mainLayer.offsetY( -h/2 );
                    
                    panGroup.offsetX( offset.x );
                    panGroup.offsetY( offset.y );
                    panGroup.scale({
                        x: scale,
                        y: scale
                    });
                    stage.batchDraw();

                    if ( nocache !== false ){
                        cache();
                    }
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
                        ,sel = selected.offset()
                        ;

                    function off(){
                        refresh();
                        self.off('moveend', off);
                        self.off('move', move);
                    }

                    function move( e, delta ){
                        offset.x = ( old.x - delta.x/scale );
                        offset.y = ( old.y - delta.y/scale );
                        refresh( false );
                    }

                    self.on('moveend', off);
                    self.on('move', move);
                });

                self.on('refresh', refresh);

                self.on('clicked', function( e, node ){
                    var num = node.id()
                        ,p = node.position()
                        ;

                    if ( num ){
                        self.selectedNode = node;
                        num = num.replace(/^[^-]*-/, '');
                        selected.position( p );
                        mainLayer.draw();
                        self.emit( 'hash' );

                        self.after('domready').then(function(){
                            self.$number.text( num );
                        });
                    }
                });

                self.on('refresh-layout', function(){
                    if ( self.selectedNode ){
                        self.emit('clicked', self.selectedNode);
                    }
                });

                self.on('goto', function( e, num ){
                    var node = num && stage.find('#circle-'+num)
                        ,pos
                        ;
                    if ( node && node.length ){
                        node = node[0];
                        pos = node.position();
                        offset.x = pos.x;
                        offset.y = pos.y;
                        self.scale = scale = 2;
                        self.emit('clicked', node);
                        refresh();
                    }
                });

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
                            fill: '#ccc',
                            id: 'circle-' + (i + 1)
                        });

                        symb.on('click tap', self.clickCallback);

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
                                id: 'text-' + (i + 1),
                                fontSize: 12,
                                fontFamily: 'monospace',
                                fill: 'rgba(20, 20, 20, 0.5)',
                                align: 'center',
                                offset: {
                                    x: size/2,
                                    y: (size - 8)/2
                                }
                            });

                            symb.on('click tap', self.clickCallback);

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

                self.$number = $('#number-id');

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




