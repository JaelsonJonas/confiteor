// Carrega os scripts do app no Node (eles se registram em globalThis.Confiteor).
require('../js/dados/perguntas.js');
require('../js/dados/exemplos.js');
require('../js/dados/oracoes.js');
require('../js/logica.js');

module.exports = globalThis.Confiteor;
