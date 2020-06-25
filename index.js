/////////////////////////////////////////////////////////////////////
//                          Configuration                          //
/////////////////////////////////////////////////////////////////////

// No configuration at the moment


/////////////////////////////////////////////////////////////////
//                          Constants                          //
/////////////////////////////////////////////////////////////////

// # Game Information
// Nexus Mods domain for the game. e.g. nexusmods.com/bloodstainedritualofthenight
const GAME_ID = 'xplane11';

//Steam Application ID, you can get this from https://steamdb.info/apps/
const STEAMAPP_ID = '269950';

//GOG Application ID, you can get this from https://www.gogdb.org/
const GOGAPP_ID = '';


// # Files and directories
const AIRCRAFT_FILE_EXT = '.acf';
const AIRCRAFT_SUBDIR = 'Aircraft';
const PLUGIN_FILE_EXT = '.xpl';


// # Library imports
// Import some assets from Vortex we'll need.
const path = require('path');
const { fs, log, util } = require('vortex-api');

// For finding game via registry
const winapi = require('winapi-bindings');


// # Additional Tools
const MODDING_TOOLS = [
  // Ortho4XP
  {
    id: 'Ortho4XP',
    name: 'Ortho4XP',
    //logo: 'ortho4xp.png',
    executable: () => 'Ortho4XP.exe',
    requiredFiles: [
      'Ortho4XP.exe',
    ],
    relative: false,
    shell: false,
    exclusive: true,
  },
];


////////////////////////////////////////////////////////////
//                          MAIN                          //
////////////////////////////////////////////////////////////

/**
 * This is the main function Vortex will run when detecting the game extension. 
 */
function main(context) {
	// https://nexus-mods.github.io/vortex-api/interfaces/igame.html
	context.registerGame({
		contributed: 'Hobadee',
		id: GAME_ID,
		name: 'X-Plane 11',
		mergeMods: false,
		queryPath: findGame,
		supportedTools: MODDING_TOOLS,
		queryModPath: () => '.',
		logo: 'gameart.png',
    executable: () => 'X-Plane.exe',
    final: false,
    version: '0.0.1',
		requiredFiles: [
		  'X-Plane.exe',
		  'Resources/default data/earth_nav.dat'
		],
		//setup: prepareForModding,
		environment: {
		  SteamAPPId: STEAMAPP_ID,
		},
		details: {
		  steamAppId: STEAMAPP_ID,
		  gogAppId: GOGAPP_ID,
		},
  });
  
  
  log('error', 'DEBUG: registerInstaller - aircraft');
  // https://nexus-mods.github.io/vortex-api/interfaces/iextensioncontext.html#registerinstaller
	context.registerInstaller(
    'xplane11-aircraft',
    25,
    testAircraftMod,
    installAircraft
  );
  log('error', 'DEBUG: registerModType');
  context.registerModType(
    'xplane11-aircraft-type',
    15,
    (gameId) => (gameId === GAME_ID),
    () => (path.join(getDiscoveryPath(context.api), AIRCRAFT_SUBDIR)),
    isAircraftModType,
    /*[
        mergeMods: false,
        name: 'xplane11-aircraft-type'
    ]*/
  );

  log('error', 'DEBUG: registerInstaller - scenery');
  context.registerInstaller('xplane11-scenery', 50, testScenery, installScenery);
  
  log('error', 'DEBUG: registerInstaller - plugin');
  context.registerInstaller('xplane11-plugin', 75, testPlugin, installPlugin);
  
	
	return true
}


/////////////////////////////////////////////////////////////////////////
//                          General Functions                          //
/////////////////////////////////////////////////////////////////////////

function findGame() {
  try {
    const instPath = winapi.RegGetValue(
      'HKEY_LOCAL_MACHINE',
      'SOFTWARE\\WOW6432Node\\GOG.com\\Games\\' + GOGAPP_ID,
      'PATH');
    if (!instPath) {
      throw new Error('empty registry key');
    }
    return Promise.resolve(instPath.value);
  } catch (err) {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID, GOGAPP_ID])
      .then(game => game.gamePath);
  }
}


const getDiscoveryPath = (api) => {
  const store = api.store;
  const state = store.getState();
  const discovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
  if ((discovery === undefined) || (discovery.path === undefined)) {
    // should never happen and if it does it will cause errors elsewhere as well
    log('error', 'xplane11 was not discovered');
    return '.';
  }

  return discovery.path;
}


/**
 * To be used with find()
 * Find a file by an extension
 * 
 * @param {string} extension Extension to search for
 * @returns {closure} Closure to find files by extension
 */
function fileByExtension(extension) {
  //log('error', 'DEBUG: fileByExtension: extension='+extension);
  return function(file){
    //log('error', 'DEBUG: fileByExtension: path.extname='+path.extname(file).toLowerCase());
    //log('error', 'DEBUG: fileByExtension: extension check1='+(path.extname(file).toLowerCase() === extension));
    //log('error', 'DEBUG: fileByExtension: extension check2='+(path.extname(file).toLowerCase() == extension));
    path.extname(file).toLowerCase() === extension.toLowerCase();
  };
}


/////////////////////////////////////////////////////////////////////
//                          Aircraft Mods                          //
/////////////////////////////////////////////////////////////////////

/**
 * Test if this mod is an Aircraft Type mod.
 * @param {IInstallResult} instructions 
 */
function isAircraftModType(instructions){
  
  log('warn', 'DEBUG: Running isAircraftModType');

  const filtered = instructions.filter(
    instr => (instr.type === 'copy')
    &&
    (path.extname(instr.source) === AIRCRAFT_FILE_EXT)
  );
  return Promise.resolve(filtered.length > 0);
/*
  const isAircraftModType = instructions.find(
    inst => (inst.type === 'copy')
    &&
    inst.source.endsWith(AIRCRAFT_FILE_EXT)
  );
  return Promise.resolve(isAircraftModType !== undefined);
*/
}


/**
 * Check if mod is an Aircraft mod
 * 
 * https://nexus-mods.github.io/vortex-api/globals.html#testsupported
 * @param {string[]} files
 * @param {string} gameId
 * @return Promise ISupportedResult
 */
function testAircraftMod(files, gameId) {
  
  log('error', 'DEBUG: Running testAircraftMod');

  // Make sure we're able to support this mod.
  let supported =
    (gameId === GAME_ID)
    &&
    // Simple check to see if we have an "acf" file in the mod
    (files.find(fileByExtension(AIRCRAFT_FILE_EXT)) !== undefined);

  //log('error', 'DEBUG: gameID Check=' + (gameId === GAME_ID));
  //log('error', 'DEBUG: files=' + files);
  log('error', 'DEBUG: files Check=' + files.find(fileByExtension(AIRCRAFT_FILE_EXT)));
  log('error', 'DEBUG: Supported=' + supported);
  
  // This is what we are returning:
  // https://nexus-mods.github.io/vortex-api/interfaces/isupportedresult.html
  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}


/**
 * This was taken from boilerplate.
 * Since X-Plane traverses subdirectories, this can probably be simplified
 *
 * https://nexus-mods.github.io/vortex-api/globals.html#installfunc
 * @param files string[]
 * @param destinationPath string
 * @param gameId string
 * @param progressDelegate ProgressDelegate
 * @return Promise IInstallResult
 */
function installAircraft(files, destinationPath, gameId, progressDelegate) {

  log('error', 'DEBUG: Running installAircraft');

  const modFile = files.find(fileByExtension(AIRCRAFT_FILE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  
  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file => 
    ((file.indexOf(rootPath) !== -1) 
    && (!file.endsWith(path.sep))));

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });

  return Promise.resolve(instructions);
}


////////////////////////////////////////////////////////////////////
//                          Scenery Mods                          //
////////////////////////////////////////////////////////////////////

/**
 *
 */
function testScenery(files, gameId) {}


/**
 *
 */
function installScenery(files) {}


////////////////////////////////////////////////////////////////////
//                          General Mods                          //
////////////////////////////////////////////////////////////////////

/**
 *
 */
function testPlugin(files, gameId) {}


/**
 *
 */
function installPlugin(files) {}


/////////////////////////////////////////////////////////////////
//                          Bootstrap                          //
/////////////////////////////////////////////////////////////////

/**
 *
 */
module.exports = {
  default: main,
};
