define(
    [
        'lodash'
    ],
    function(
        _
    ){
        var Tau = Math.PI * 2; // two pi
        var Phi = (1 + Math.sqrt(5)) / 2; // golden ratio
        var PhiSq = Math.pow(Phi, 2); // golden ratio squared

        function sign( x ){
            return x >= 0 ? 1 : -1;
        }

        // ulam spiral coords
        function ulam( x, y ){
            var alpha = ( y + x )
                ,beta = ( y - x )
                ,alphaAbs
                ,betaAbs
                ;
            
            alphaAbs = Math.abs( alpha );
            betaAbs = Math.abs( beta );
            
            return Math.pow(alphaAbs + betaAbs, 2) +
                sign(beta) * ( alphaAbs - alpha ) +
                beta + 1
                ;
        }

        function ulamSpiralOTHER( max ){
            var arr = []
                ,N
                ;
            
            for (var j = -max; j <= max; j++){
                for (var i = -max; i <= max; i++){
                    N = ulam( i, j );
                    arr[ N ] = [ 
                        i, 
                        -j 
                    ];
                }
            }
            
            return arr;
        }

        function ulamSpiral( stop ){
            var lr = 1
                ,td = 1
                ,edge = 1
                ,x = 0
                ,y = 0
                ,i = 1
                ,j = 0
                ,arr = [ [0, 0] ]
                ,max = stop || 100
                ;
            
            while ( i < max ){
                for ( j = 0; j < edge; j++, i++ ){
                    x += lr;
                    arr.push([
                        x,
                        y
                    ]);
                }
                lr *= -1;

                for ( j = 0; j < edge; j++, i++ ){
                    y += td;
                    arr.push([
                        x,
                        y
                    ]);
                }
                td *= -1;
                edge++;
            }
            
            return arr;
        }

        function sacksSpiral( stop ){
            var i = 1
                ,arr = []
                ,r
                ,max = stop || 100
                ;
            while ( i < max ){
                r = Math.sqrt(i);
                arr.push([
                    Math.cos( r * Tau ) * r,
                    Math.sin( r * Tau ) * r
                ]);
                i++;
            }
            return arr;
        }

        function vogelSpiral( stop ){
            var i = 1
                ,arr = []
                ,r
                ,theta
                ,max = stop || 100
                ;
            while ( i < max ){
                r = Math.sqrt(i);
                theta = i * (Tau / PhiSq);
                arr.push([
                    Math.cos( theta ) * r,
                    Math.sin( theta ) * r
                ]);
                i++;
            }
            return arr;
        }

        function grid( stop ){

            var i = 1
                ,x = 0
                ,y = 0
                ,arr = []
                ,w = Math.max(2, Math.round(Math.sqrt( stop )))
                ;

            while ( i < stop ){
                for ( x = 0; x < w; x++, i++ ){
                    if ( i >= stop ){
                        break;
                    }
                    arr.push([ x, -y ]);
                }
                y++;
            }

            return arr;
        }

        function triangle( stop ){

            var i = 0
                ,dtheta = Math.PI * 2/3
                ,theta = 0
                ,edge = 1
                ,x = 0
                ,y = 0
                ,n = 1
                ,arr = [ [0, 0] ]
                ;

            while ( n < stop ){
                for ( i = 0; i < edge && n < stop; ++i, ++n ){
                    x += Math.cos( theta );
                    y += Math.sin( theta );
                    arr.push([ x, y ]);
                }
                theta += dtheta;
                edge++;
            }

            return arr;
        }

        function pyramid( stop ){

            var i = 0
                ,sx = Math.sqrt(3)
                ,sy = 1
                ,n = 0
                ,row = 1
                ,x = 0
                ,y = 0
                ,arr = []
                ;

            while ( n < stop ){
                for ( i = 0; i < row && n < stop; ++i, ++n ){
                    x = sx * (i - (row-1)/2);
                    y = sy * row;
                    arr.push([ x, -y ]);
                }
                row++;
            }

            return arr;
        }

        return {
             ulamSpiral: ulamSpiral
            ,sacksSpiral: sacksSpiral
            ,vogelSpiral: vogelSpiral
            ,grid: grid
            ,pyramid: pyramid
            ,triangle: triangle
        }
    }
);
