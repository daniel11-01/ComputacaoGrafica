// estado.js — Estado global partilhado entre todos os módulos
// Nenhum módulo importa outro módulo — todos importam apenas este ficheiro e 'three'.
export var estado = {
    // --- Core ---
    cena:               null,   // THREE.Scene
    renderer:           null,   // THREE.WebGLRenderer
    relogio:            null,   // THREE.Clock
    _needsResize:       false,

    // --- Câmaras (Objetivo 4) ---
    camaraPerspetiva:   null,
    camaraOrtografica:  null,
    cameraAtiva:        null,
    modoCamara:         'perspetiva',
    modoSeguirSonic:    false,
    modoCamaraLivre:    false,
    camLivreYaw:        0,
    camLivrePitch:      0,
    vistaAtual:         'Vista geral (3/4)',
    teclasPremidas:     { w: false, a: false, s: false, d: false, shift: false, control: false },
    _vCamForward:       null,   // THREE.Vector3 pré-alocado
    _vCamRight:         null,
    _vCamDeslocamento:  null,
    _vCamLookAt:        null,
    _vAlvoSeguir:       null,

    // --- Cenário (Objetivo 1) ---
    sol:            null,
    nuvens:         [],
    oceano:         null,
    ceu:            null,

    // --- Objetos complexos (Objetivo 2) ---
    aneisDecorativos:   [],
    palmeiras:          [],
    vegetacao:          [],
    barcos:             [],
    gaivotas:           [],
    ilhasDistantes:     [],
    LOOP_CZ:            -28.75,
    LOOP_RAIO:          7,
    LOOP_CY:            7.35,   // CHAO_Y_SONIC + LOOP_RAIO (atualizado após carga do GLB)

    // --- Texturização (Objetivo 3) ---
    carregadorTexturas:         null,   // THREE.TextureLoader
    materiaisFolhas:            {},     // cache: cor → MeshStandardMaterial
    texturaCascaPartilhada:     null,
    texturaXadrezPartilhada:    null,
    materialTerraPartilhado:    null,
    _matCauleFlor:      null,
    _matCentroFlor:     null,
    _matsPetalaFlor:    null,
    _geoCauleFlor:      null,
    _geoCentroFlor:     null,
    _geoPetalaFlor:     null,
    _matsRelvaTufos:    null,
    _geosRelvaTufo:     null,
    tufosRelva:         [],

    // --- Interatividade — Sonic (Objetivo 6) ---
    sonicPlaceholder:   null,
    sonicBola:          null,
    sonicPartes:        {},
    sonicMixer:         null,
    sonicClips:         [],
    sonicAcaoAtiva:     null,
    sonicEmMovimento:   false,
    modoBola:           false,
    sonicEmSalto:       false,
    sonicVelocidadeY:   0,
    sonicVidas:         3,
    sonicMorreu:        false,
    sonicInvencivel:    0,
    sonicTempoMorte:    0,
    ultimoCheckpoint:   null,   // THREE.Vector3, inicializado em interatividade.js

    // --- Física ---
    GRAVIDADE:          -25,
    VELOCIDADE_SALTO:   15,
    CHAO_Y_SONIC:       0.35,

    // --- Loop/looping ---
    modoLoop:           false,
    loopAngulo:         0,

    // --- Finalização — Colisões / Nível (Objetivo 7) ---
    elementosNivel:     [],
    areasColisao:       [],

    // --- Anéis coletados ---
    aneisColecionados: 0,

    // --- Callbacks (evita importação cruzada entre módulos) ---
    _callbacks: {
        sonicMorrer:        null,   // registado por interatividade.js; chamado por finalizacao.js
        atualizarHUDAneis:  null,   // registado por interatividade.js; chamado por finalizacao.js
    }
};
