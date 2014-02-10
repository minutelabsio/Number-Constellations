/**
 * Config options at: http://requirejs.org/docs/api.html#config
 */
require.config({

    config: {
        // module specific configuration
    },
    
    shim: {
        
    },

    paths: {
        //
        //  This is where you can add paths to any plugins or vendor scripts.
        //

        // Plugins
        'text': 'plugins/text',
        'json': 'plugins/json',
        'tpl' : 'plugins/tpl',
        'async' : 'plugins/async',

        // Templating
        'dot' : 'vendor/doT',

        // MVC
        'stapes': 'vendor/stapes',
        'moddef': 'util/module',

        // utility
        'lodash': 'vendor/lodash.custom.min',
        
        // jQuery
        'jquery': 'vendor/jquery',

        // Mouse/Touch events
        'hammer': 'vendor/hammer',

        // canvas draw
        'kinetic': 'vendor/kinetic',

        // settings
        'dat': 'vendor/dat.gui',

        // math.js utility library
        'math': 'vendor/math'
    },

    packages: [
        { name: 'when', location: 'vendor/when', main: 'when' }
    ],

    map: {
        
        '*' : {
            'jquery': 'modules/adapters/jquery', // jQuery noconflict adapter
            'site-config': 'config/site-config.json'
        },

        'modules/adapters/jquery': {
            'jquery': 'jquery'
        }
    }
});
