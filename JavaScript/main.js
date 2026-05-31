// main.js — Ponto de entrada e orquestrador de todos os módulos
// Sem. 0/1 → Sem. 7: integração completa da aplicação "Sonic Retro"
import { estado } from './estado.js';

// Objetivo 1 — Setup, Terreno, Skybox
import { inicializarAmbiente, criarTerreno, criarSkyboxRetro, atualizarAmbiente } from './ambiente.js';

// Objetivo 2 — Objetos Complexos
import { criarLooping, criarVegetacao, criarAneis, criarIlhasDistantes, criarBarco, criarGaivotas, atualizarObjetosComplexos } from './objetosComplexos.js';

// Objetivo 3 — Texturização
import { inicializarTexturizacao } from './texturizacao.js';

// Objetivo 4 — Câmaras
import { inicializarCamaras, registarEventosCamara, atualizarCamaras, atualizarDimensoesCamara } from './camaras.js';

// Objetivo 5 — Iluminação
import { criarLuzes } from './iluminacao.js';

// Objetivo 6 — Interatividade e Animação
import { inicializarInteratividade, criarSonicPlaceholder, atualizarInteratividade } from './interatividade.js';

// Objetivo 7 — Finalização
import { criarElementosNivel, atualizarFinalizacao } from './finalizacao.js';

// Sistema de jogo — Timer, Anéis, Resultados, CSV
import { inicializarSistema, atualizarSistema } from './sistema.js';

// --- Resize responsivo ---
window.addEventListener('resize', function() { estado._needsResize = true; });

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', Start);

function Start() {
    // 1. Infraestrutura (ordem crítica: texturas → cena → câmaras)
    inicializarTexturizacao();      // TextureLoader + texturaCasca
    inicializarAmbiente();          // cena, renderer, relógio, canvas
    inicializarCamaras();           // cameras + vetores pré-alocados + labelVista
    registarEventosCamara();        // eventos de teclado/rato para câmaras

    // 2. Conteúdo da cena
    criarTerreno();                 // plataformas, praia, oceano
    criarSkyboxRetro();             // céu, sol, nuvens
    criarIlhasDistantes();          // ilhas decorativas no horizonte
    criarBarco();                   // 2 barcos a circular
    criarGaivotas();                // 6 gaivotas animadas
    criarLuzes();                   // AmbientLight + DirectionalLight + sombras
    criarLooping();                 // loop GLB (async — não bloqueia)
    criarVegetacao();               // palmeiras + arbustos
    criarAneis();                   // anéis dourados decorativos
    criarElementosNivel();          // molas, checkpoints, pontes, picos, flores, placa

    // 3. Entidade jogável
    inicializarInteratividade();    // HUD de vidas + input WASD/Espaço + callback de morte
    criarSonicPlaceholder();        // Sonic GLB (async — não bloqueia)
    inicializarSistema();           // Timer HUD + ring tracker (anéis têm de existir antes)

    // 4. Render inicial + loop
    _atualizarDimensoes();
    estado.renderer.render(estado.cena, estado.cameraAtiva);
    requestAnimationFrame(_loop);
}

// --- Loop de render ---
function _loop() {
    var delta = estado.relogio.getDelta();
    var tempo = estado.relogio.elapsedTime;

    // Resize responsivo (flag definida pelo evento 'resize')
    if (estado._needsResize) {
        _atualizarDimensoes();
        estado._needsResize = false;
    }

    // Atualização de cada módulo por ordem determinística
    atualizarSistema(delta);                    // timer + ring collection + goal detection
    atualizarCamaras(delta);                    // câmara livre + follow Sonic
    if (!estado.nivelConcluido) {
        atualizarInteratividade(delta, tempo);  // física, movimento, animação do Sonic
        atualizarFinalizacao(delta);            // colisões + checkpoints
    }
    atualizarObjetosComplexos(delta, tempo);    // anéis, barcos, gaivotas, vegetação
    atualizarAmbiente(delta, tempo);            // nuvens, ondas do oceano

    estado.renderer.render(estado.cena, estado.cameraAtiva);
    requestAnimationFrame(_loop);
}

// Atualiza dimensões do renderer e frustums das câmaras
function _atualizarDimensoes() {
    var largura = window.innerWidth - 15;
    var altura  = window.innerHeight - 100;
    estado.renderer.setSize(largura, altura);
    atualizarDimensoesCamara(largura, altura);
}
