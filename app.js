'use strict';

process.on('unhandledRejection', () => {});
process.on('rejectionHandled', () => {});
var prm = Promise.reject(new Error(' '));
setTimeout(() => { prm.catch((err) => { console.log( err.message ) }) }, 0);

//process.on('unhandledRejection', ( err )    => { });
//process.on('rejectionHandled', ( err )      => { });
// process.on('unhandledRejection', ( err )    => { console.trace('unhandledRejection', err ); });
// process.on('rejectionHandled', ( err )      => { console.trace('rejectionHandled', err ); });

//Promise.reject(new Error(''))
//setTimeout(() => { prm.catch((err)          => { console.trace('prm', err ); }) }, 0)

// process.on('uncaughtException', function (err) {
//     console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
//     console.error(err.stack)
//     process.exit(0)
// })

// environment variable application
require('dotenv').config()

const path              = require('path')
const fs                = require('fs')
const bytenode          = require('bytenode')
const v8                = require('v8')
const tracer            = require('tracer')

const { app, BrowserWindow }    = require('electron')
const Twig                      = require('twig')
const TwigElectron              = require('electron-twig')

global.base_dir         = path.join( __dirname )
global.components_dir   = path.join( __dirname, 'components' )
global.frontend_dir     = path.join( __dirname, 'frontend' )
global.backend_dir      = path.join( __dirname, 'backend' )
global.lang_dir         = path.join( __dirname, 'lang' )
global.data_dir         = path.join( __dirname, 'data' )
global.tmp_dir          = path.join( __dirname, 'tmp' )

v8.setFlagsFromString('--no-lazy');

// Если нет файла с аккаунтами - создать пустой
let accounts_file = path.join( data_dir, 'accounts.json' )
let accounts_dist_file = path.join( data_dir, 'accounts.dist.json' )
if( !fs.existsSync( accounts_file ) ) fs.copyFile( accounts_dist_file, accounts_file, () => {} )

// Если нет файла с группами - создать пустой
let groups_file = path.join( data_dir, 'groups.json' )
let groups_dist_file = path.join( data_dir, 'groups.dist.json' )
if( !fs.existsSync( groups_file ) ) fs.copyFile( groups_dist_file, groups_file, () => {} )

// Если нет файла с настройками - создать пустой
let settings_file = path.join( data_dir, 'settings.json' )
let settings_dist_file = path.join( data_dir, 'settings.dist.json' )
if( !fs.existsSync( settings_file ) ) fs.copyFile( settings_dist_file, settings_file, () => {})

// Пересборка данных согласно указанной схеме
;( async () => {
    
    let shema = require( path.join( data_dir, 'shema.json' ) )
    let settings = require( path.join( data_dir, 'settings.json' ))
    let sh_settings = shema.settings
    let accounts = require( path.join( data_dir, 'accounts.json' ))
    let sh_accounts = shema.accounts

    var new_settings = {}
    for (var key in sh_settings ) {
        var value = sh_settings[key]
        if( settings[key] !== undefined ){
            if( value.type === 'integer' ){
                new_settings[key] = Number( settings[key] )
            }
            if( value.type === 'string' ){
                new_settings[key] = settings[key].toString()
            }
        }

        if( settings[key] === undefined ){
            if( value.type === 'integer' ){
                new_settings[key] = Number( value.default )
            }
            if( value.type === 'string' ){
                new_settings[key] = value.default.toString()
            }
        }
    }
    fs.writeFileSync( path.join( data_dir, 'settings.json' ), JSON.stringify( new_settings, null, 4 ) );
    
    
    var new_accounts = []
    accounts.map( account => {
        var plus = {}
        for (var key in sh_accounts ) {
            var value = sh_accounts[key]
            plus[key] = value.default
            if( account[key] !== undefined ){
                if( value.type === 'integer' ){
                    plus[key] = Number( account[key] )
                }
                if( value.type === 'string' ){
                    plus[key] = account[key].toString()
                }
            }
        }
        new_accounts.push( plus )
    })
    fs.writeFileSync( path.join( data_dir, 'accounts.json' ), JSON.stringify( new_accounts, null, 4 ) );
        
})()

global.helpers          = require( path.join( components_dir, 'helpers' ) )
global.resources        = require( path.join( components_dir, 'resources' ) )
global.settings         = require( path.join( data_dir, 'settings.json' ))

global.logger = {
    log: function( first = '', second = '', third = '', message = '' ){
        console.log( first, second, third, message );
    }
}

if( settings.log_write !== undefined && settings.log_write == 'on' ){
    global.logger = tracer.console({
        // titles - 'log', 'trace', 'debug', 'info', 'warn', 'error','fatal'
        level: 'log', // 0-'log', 1-'trace', 2-'debug', 3-'info', 4-'warn', 5-'error', 6-'fatal'
        format: [
            "{{timestamp}} (in {{file}}:{{line}}) <{{title}}> {{message}} \n",
            "--- END --- \n\n\n",
            { 
                error: [
                    "{{timestamp}} <{{title}}> {{message}} \n",
                    "(in {{file}}:{{line}}) \n",
                    "all Stack:\n{{stack}} \n",
                    "--- END --- \n\n\n"
                ]
            }
         ],
        dateformat: 'HH:MM:ss.L',
        transport: function( data ){
            fs.appendFile(path.join( __dirname, 'logs' ) + '/' + helpers.date_format('yyyy_MM_dd') + '.log', data.rawoutput + '\n\n', err => {
                if (err) throw err
            })
        }
    })
}

global.scheduler_file           = path.join( backend_dir, 'scheduler.jsc' )
global.bender_file              = path.join( backend_dir, 'bender.jsc' )

global.wallet_file              = path.join( backend_dir, 'wallet.js' )
global.token_reddit_file        = path.join( backend_dir, 'token_reddit.js' )
global.code_email_file          = path.join( backend_dir, 'code_email.js' )
global.alcor_file               = path.join( backend_dir, 'alcor.js' )
global.controller_file          = path.join( backend_dir, 'controller.js' )
global.token_email_file         = path.join( backend_dir, 'token_email.js' )
global.test_email_file          = path.join( backend_dir, 'test_email.js' )

if( settings.dev_mode !== undefined && settings.dev_mode.toString() == 'on' )  {

    bytenode.compileFile( './sources/bender.src.js',         './backend/bender.jsc');
    bytenode.compileFile( './sources/scheduler.src.js',      './backend/scheduler.jsc');
    
    global.sources_dir = path.join( __dirname, 'sources' )

    global.scheduler_file           = path.join( sources_dir, 'scheduler.src.js' )
    global.bender_file              = path.join( sources_dir, 'bender.src.js' )

    // Соорудить заготовку под настройки
    var shema                   = require( path.join( data_dir, 'shema.json' ) )
    var shema_settings          = shema.settings
    var dist_settings = {}
    for (var key in shema_settings ) {
        var value = shema_settings[key]
        dist_settings[key] = value.default
    }
    fs.writeFileSync( path.join( data_dir, 'settings.dist.json' ), JSON.stringify( dist_settings, null, 4 ) );

}

// Расширения для ТВИГа
require( path.join( components_dir, 'twig' ))( Twig )

let mainWindow;

async function createWindow() {

    let settings    = await resources.settings.list()
    let languages   = await resources.languages.list()
    let lang        = await resources.languages.get()

    mainWindow = new BrowserWindow({ 
        minWidth: 830,
        minHeight: 740,
        icon: path.join( base_dir, 'icon.ico' ),
        webPreferences: { 
            nodeIntegration: true,
			enableRemoteModule: true
        } 
    });

    if( settings.dev_mode.toString() == 'on' ){
        mainWindow.openDevTools();
    }else{
        mainWindow.setMenu(null);
    }

    mainWindow.loadFile(`${frontend_dir}/index.twig`)
    TwigElectron.view = {
        settings: settings,
        lang: lang,
        langs: languages
    }
    
    // Закрытие окна
    mainWindow.on('close', data => {
        mainWindow = null;
    });

    require( controller_file )( mainWindow )

}

// Нажали - закрыть приложение
app.on('window-all-closed', data => {
    if ( process.platform !== 'darwin' ) app.quit()
});

// Запуск по готовности...
app.on('ready', createWindow);