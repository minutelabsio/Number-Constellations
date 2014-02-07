/**
 * Number sequence functions
 * all return an array containing the sequences
 */
define(
    [
        'lodash'
        //'json!data/the_sequence'
    ],
    function(
        _
        //the_sequence
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


        return API;
    }
);
