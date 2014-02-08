/**
 * Number sequence functions
 * all return an array containing the sequences
 */
define(
    [
        'lodash',
        'json!data/vampire.json'
    ],
    function(
        _,
        vampire
    ){

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

            if ( max <= 2 ) return arr;
            
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

        API.fibonaccis = function( max ){

            max = max || this.maxSeqLength;

            var arr = [ 0, 1 ]
                ,n = 1
                ;

            for ( n; n < max; ++n ){
                
                arr.push( arr[ n ] + arr[ n - 1 ] );
            }
            
            arr.shift();
            arr.shift();

            return arr;
        };

        API.vampire = vampire;

        return API;
    }
);
