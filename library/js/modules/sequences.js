/**
 * Number sequence functions
 * all return an array containing the sequences
 */
define(
    [
        'lodash',
        'json!data/vampire.json',
        'json!data/carmichael.json',
        'json!data/metadromes.json',
        'json!data/fibonacci-primes.json',
        'json!data/mult-partition.json'
    ],
    function(
        _,
        vampire,
        carmichael,
        metadromes,
        fibonacciPrimes,
        multPartition
    ){
        'use strict';
        /**
         * NOTE: all sums start at n = 1, not zero because we don't plot zero
         * on the spirals
         */

        var Phi = (1 + Math.sqrt(5)) / 2; // golden ratio
        var invLnPhi = 1/Math.log(Phi);
        var sqrt5 = Math.sqrt(5);
        var invSqrt5 = 1/sqrt5;

        // http://en.wikipedia.org/wiki/Fibonacci_number#Computation_by_rounding
        function fibIndex( f ){
            return ( Math.log(f * sqrt5 + 0.5) * invLnPhi ) | 0;
        }

        function getFib( n ){
            return Math.round(Math.pow(Phi, n) * invSqrt5);
        }

        function rndInt( n ){
            return Math.floor(Math.random() * n);
        }

        var API = {
            // default sequence length
            maxSeqLength: 100
        };

        API.primes = function( max ){

            max = max || this.maxSeqLength;

            var arr = [ 2 ]
                ,i = 2
                ,l = 1
                ,add = true
                ;

            if ( max <= 2 ){ return arr; }
            
            while ( i < max ){
                add = true;
                for ( var j = 0; j < l; j++ ){
                    if ( (i % arr[ j ]) === 0 ){
                        add = false;
                        break;
                    }
                }
                
                if (add){
                    l = arr.push( i );
                }
                i++;
            }

            return arr;
        };

        API.fibonaccis = function( max, byIndex ){

            max = max || this.maxSeqLength;

            var arr = [ 0, 1 ]
                ,n = 1
                ,f = 1
                ;

            byIndex = !!byIndex;

            // if byIndex, then we get the fibonacci numbers up to the index "max"
            // otherwise we get the fibonacci number value nearest "max"
            while ( byIndex ? n < max : f < max ){
                f = arr[ n ] + arr[ n - 1 ];
                arr.push( f );
                n++;
            }
            
            arr.shift();
            arr.shift();

            return arr;
        };

        // from http://www.dcs.gla.ac.uk/~jhw/spirals/spiral_nfib.py
        var fibSum = _.memoize(function( n ){
            
            var idx = fibIndex( n ) //- 1
                ,fibi = getFib( idx )
                ,k = n - fibi
                ;

            if ( n < 0 ){
                return 0;
            }

            if ( n <= 2 ){

                return 1;

            } else if ( k >= 0 && k < getFib( idx - 3 ) ){

                return fibSum(getFib( idx - 2 ) + k) + fibSum( k );

            } else if ( k >= getFib( idx - 3 ) && k < getFib( idx - 2 ) ){

                return 2 * fibSum( k );
            }

            return fibSum(getFib( idx + 1 ) - 2 - k);
        });

        API.fibonacciSums = function( max ){

            var arr = []
                ,n = 1
                ;

            for ( ; n < max; ++n ){
                arr.push( fibSum( n ) );
            }

            return arr;
        };

        API.randoms = function( max ){

            max = max || this.maxSeqLength;

            var n = 0
                ,arr = []
                ;

            // if byIndex, then we get the numbers up to the index "max"
            // otherwise we get the number value nearest "max"
            while ( n < max ){
                n++;

                if ( Math.random() > 0.5 ){
                    arr.push( n );
                }
            }

            return arr;
        };

        API.pythTriples = function( max ){

            var m
                ,n
                ,t1
                ,t2
                ,t3
                ,arr = []
                ;
                
            // loop on m from 2 to max
            for (m=2; m <= max; m++){
                // now loop on n from 1 to m-1
                for (n=1; n < m; n++){
                    // evaluate and print triple
                    if ( n*n > max ){ 
                        max = 0;
                        break;
                    }
                    t1 = m*m-n*n;
                    t2 = 2*m*n;
                    t3 = m*m+n*n;
                    arr.push( t1, t2, t3 );
                }
            }

            return _(arr).sortBy().uniq(true).valueOf();
        };

        API.pythPrimes = function( max ){

            return _.filter(API.primes( max ), function( n ){
                return ((n - 1) % 4 === 0);
            });
        };

        metadromes.shift(); // remove the leading zero

        API.vampire = _.sortBy(vampire);
        API.carmichael = carmichael;
        API.metadromes = metadromes;
        API.fibonacciPrimes = fibonacciPrimes;
        API.multPartition = multPartition;

        return API;
    }
);
