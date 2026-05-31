// interatividade.js — Objetivo 6: Input, Sonic, Física, Animações e HUD de Vidas
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { estado } from './estado.js';

var carregadorGLTF = new GLTFLoader();

// labelVidas é privado a este módulo
var labelVidas;

var SONIC_PIVOT = {
    ombroEsq:   new THREE.Vector3(-0.28, 0.65, 0.0),
    ombroDir:   new THREE.Vector3( 0.28, 0.65, 0.0),
    quadrilEsq: new THREE.Vector3(-0.13, 0.27, 0.0),
    quadrilDir: new THREE.Vector3( 0.13, 0.27, 0.0),
};

// ============================================================
// Inicialização: HUD, teclado WASD/Space, callback de morte
// ============================================================
export function inicializarInteratividade() {
    // HUD de vidas
    labelVidas = document.createElement('div');
    labelVidas.style.cssText = 'position:fixed;top:50px;left:10px;background:rgba(0,0,0,0.7);color:#ff6688;padding:6px 14px;font-family:monospace;font-size:22px;border-radius:6px;z-index:100;pointer-events:none;letter-spacing:4px;';
    labelVidas.textContent = '♥♥♥';
    document.body.appendChild(labelVidas);

    // Checkpoint inicial
    estado.ultimoCheckpoint = new THREE.Vector3(0, estado.CHAO_Y_SONIC, 39);

    // Registar callback de morte (chamado por finalizacao.js sem importar este módulo)
    estado._callbacks.sonicMorrer = function() { _sonicMorrer(); };

    // Teclado: WASD + Espaço
    document.addEventListener('keydown', function(evento) {
        var teclaLower = evento.key.toLowerCase();
        if (estado.teclasPremidas.hasOwnProperty(teclaLower)) {
            estado.teclasPremidas[teclaLower] = true;
        }
        // Espaço: salto ou sair do modo bola
        if (evento.code === 'Space' && !estado.modoCamaraLivre && estado.sonicPlaceholder) {
            if (estado.modoBola && estado.sonicBola) {
                estado.modoBola = false;
                estado.sonicPlaceholder.visible = true;
                estado.sonicBola.visible = false;
                estado.sonicPlaceholder.position.x = estado.sonicBola.position.x;
                estado.sonicPlaceholder.position.z = estado.sonicBola.position.z;
                estado.sonicPlaceholder.position.y = estado.CHAO_Y_SONIC;
            } else if (!estado.sonicEmSalto) {
                estado.sonicEmSalto = true;
                estado.sonicVelocidadeY = estado.VELOCIDADE_SALTO;
            }
        }
    });

    document.addEventListener('keyup', function(evento) {
        var tecla = evento.key.toLowerCase();
        if (estado.teclasPremidas.hasOwnProperty(tecla)) {
            estado.teclasPremidas[tecla] = false;
        }
    });
}

// ============================================================
// Sem. 2 + Sem. 4: Sonic — carga GLB e montagem
// ============================================================
export function criarSonicPlaceholder() {
    estado.sonicPlaceholder = new THREE.Group();
    estado.sonicPartes = {};

    var ficheiros = [
        { nome: 'sonic_corpo.glb',     chave: 'corpo'    },
        { nome: 'sonic_cabeca.glb',    chave: 'cabeca'   },
        { nome: 'sonic_braco_esq.glb', chave: 'bracoEsq' },
        { nome: 'sonic_braco_dir.glb', chave: 'bracoDir' },
        { nome: 'sonic_perna_esq.glb', chave: 'pernaEsq' },
        { nome: 'sonic_perna_dir.glb', chave: 'pernaDir' },
    ];

    var scenes = {};
    var carregados = 0;

    ficheiros.forEach(function(f) {
        carregadorGLTF.load('assets/' + f.nome, function(gltf) {
            scenes[f.chave] = gltf.scene;
            if (++carregados === ficheiros.length) _montarSonic(scenes);
        }, undefined, function(e) {
            console.warn('[Sonic] não encontrou assets/' + f.nome);
            if (++carregados === ficheiros.length) _montarSonic(scenes);
        });
    });

    estado.sonicPlaceholder.position.set(0, 0.35, 39);
    estado.cena.add(estado.sonicPlaceholder);

    // Bola — sonic_bola.glb
    estado.sonicBola = new THREE.Group();
    estado.sonicBola.visible = false;
    carregadorGLTF.load('assets/sonic_bola.glb', function(gltf) {
        var bola = gltf.scene;
        var box = new THREE.Box3().setFromObject(bola);
        var size = new THREE.Vector3();
        box.getSize(size);
        var maxDim = Math.max(size.x, size.y, size.z);
        var escalaAlvo = 1.4 / maxDim;
        bola.scale.setScalar(escalaAlvo);
        bola.rotation.x = -Math.PI / 2;
        var raio = (size.y * escalaAlvo) / 2;
        estado.sonicBola.userData.raio = raio;
        estado.sonicBola.position.set(0, 0.35 + raio, 39);
        bola.traverse(function(node) {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        estado.sonicBola.add(bola);
    }, undefined, function(err) { console.error('[sonic_bola] erro:', err); });
    estado.cena.add(estado.sonicBola);
}

function _montarSonic(scenes) {
    if (!scenes.corpo) {
        console.error('[Sonic] sonic_corpo.glb não carregado — não é possível montar');
        return;
    }

    var boxRef = new THREE.Box3().setFromObject(scenes.corpo);
    var sizeRef = new THREE.Vector3();
    boxRef.getSize(sizeRef);
    var escala = 0.9 / Math.max(sizeRef.x, sizeRef.y, sizeRef.z);

    function preparar(mesh) {
        mesh.scale.setScalar(escala);
        mesh.traverse(function(n) {
            if (n.isMesh) {
                n.castShadow = true;
                n.receiveShadow = true;
                var mats = Array.isArray(n.material) ? n.material : [n.material];
                mats.forEach(function(m) { if (m) m.side = THREE.DoubleSide; });
            }
        });
        return mesh;
    }

    estado.sonicPartes.corpo = preparar(scenes.corpo);
    estado.sonicPlaceholder.add(estado.sonicPartes.corpo);

    if (scenes.cabeca) {
        estado.sonicPartes.cabeca = preparar(scenes.cabeca);
        estado.sonicPlaceholder.add(estado.sonicPartes.cabeca);
    }

    function montarMembro(mesh, chave) {
        estado.sonicPlaceholder.add(mesh);
        estado.sonicPlaceholder.updateMatrixWorld(true);

        var boxW = new THREE.Box3().setFromObject(mesh);
        estado.sonicPlaceholder.remove(mesh);

        var sp = estado.sonicPlaceholder.position;
        var cx = (boxW.min.x + boxW.max.x) / 2 - sp.x;
        var cy = boxW.max.y - sp.y;
        var cz = (boxW.min.z + boxW.max.z) / 2 - sp.z;

        mesh.position.x -= cx;
        mesh.position.y -= cy;
        mesh.position.z -= cz;

        var pivot = new THREE.Group();
        pivot.position.set(cx, cy, cz);
        pivot.add(mesh);
        estado.sonicPlaceholder.add(pivot);
        estado.sonicPartes[chave] = pivot;

        console.log('[Sonic]', chave, 'pivot local:', cx.toFixed(3), cy.toFixed(3), cz.toFixed(3));
    }

    if (scenes.bracoDir) montarMembro(preparar(scenes.bracoDir), 'pivBracoDir');
    if (scenes.bracoDir) {
        var cloneEsq = scenes.bracoDir.clone(true);
        cloneEsq.position.set(0, 0, 0);
        cloneEsq.scale.set(-escala, escala, escala);
        montarMembro(cloneEsq, 'pivBracoEsq');
    }
    if (scenes.pernaEsq) montarMembro(preparar(scenes.pernaEsq), 'pivPernaEsq');
    if (scenes.pernaDir) montarMembro(preparar(scenes.pernaDir), 'pivPernaDir');

    if (estado.sonicPartes.pivBracoEsq && estado.sonicPartes.pivBracoDir) {
        if (estado.sonicPartes.pivBracoEsq.position.x >= 0) {
            estado.sonicPartes.pivBracoEsq.position.x = -estado.sonicPartes.pivBracoDir.position.x;
        }
    }

    var boxFinal = new THREE.Box3().setFromObject(estado.sonicPlaceholder);
    estado.sonicPlaceholder.position.y += (0.35 - boxFinal.min.y);
    estado.sonicPlaceholder.updateMatrixWorld(true);

    var boxFinalSize = new THREE.Vector3();
    boxFinal.getSize(boxFinalSize);
    console.log('[Sonic] montado | escala:', escala.toFixed(3), '| altura total:', boxFinalSize.y.toFixed(2));
}

// Toca uma animação do Sonic por nome
function _tocarAnimacaoSonic(nome, fadeDuracao) {
    if (!estado.sonicMixer || estado.sonicClips.length === 0) return;
    if (fadeDuracao === undefined) fadeDuracao = 0.2;

    var nomeLower = nome.toLowerCase();
    var clip = estado.sonicClips.find(function(c) { return c.name.toLowerCase() === nomeLower; });
    if (!clip) {
        clip = estado.sonicClips.find(function(c) { return c.name.toLowerCase().indexOf(nomeLower) !== -1; });
    }
    if (!clip) {
        var idx = (nomeLower === 'idle') ? 0 : Math.min(1, estado.sonicClips.length - 1);
        clip = estado.sonicClips[idx];
    }

    var novaAcao = estado.sonicMixer.clipAction(clip);
    if (novaAcao === estado.sonicAcaoAtiva) return;
    if (estado.sonicAcaoAtiva) estado.sonicAcaoAtiva.fadeOut(fadeDuracao);
    novaAcao.reset().fadeIn(fadeDuracao).play();
    estado.sonicAcaoAtiva = novaAcao;
}

// ============================================================
// Sistema de vidas (privado)
// ============================================================
function _atualizarHUD() {
    if (!labelVidas) return;
    var s = '';
    for (var i = 0; i < 3; i++) s += i < estado.sonicVidas ? '♥' : '♡';
    labelVidas.textContent = s;
}

function _sonicMorrer() {
    if (estado.sonicMorreu || estado.sonicInvencivel > 0) return;
    estado.sonicVidas--;
    estado.sonicMorreu = true;
    estado.sonicEmSalto = false;
    estado.modoLoop = false;
    estado.loopAngulo = 0;
    estado.sonicVelocidadeY = 7;
    estado.sonicTempoMorte = 1.8;
    estado.modoBola = false;
    if (estado.sonicBola) estado.sonicBola.visible = false;
    estado.sonicPlaceholder.visible = true;
    _atualizarHUD();
}

function _sonicRespawn() {
    estado.sonicMorreu = false;
    estado.sonicEmSalto = false;
    estado.sonicVelocidadeY = 0;
    estado.modoBola = false;
    estado.sonicPlaceholder.rotation.z = 0;
    estado.sonicPlaceholder.visible = true;
    if (estado.sonicBola) estado.sonicBola.visible = false;
    estado.sonicInvencivel = 2.0;
    if (estado.sonicVidas <= 0) {
        estado.sonicVidas = 3;
        estado.ultimoCheckpoint.set(0, estado.CHAO_Y_SONIC, 39);
        _atualizarHUD();
    }
    estado.sonicPlaceholder.position.copy(estado.ultimoCheckpoint);
}

// ============================================================
// Atualização por frame: toda a lógica de jogo do Sonic
// ============================================================
export function atualizarInteratividade(delta, tempo) {
    // Animação de morte (bounce + spin)
    if (estado.sonicMorreu && estado.sonicPlaceholder) {
        estado.sonicTempoMorte -= delta;
        estado.sonicVelocidadeY += estado.GRAVIDADE * delta;
        estado.sonicPlaceholder.position.y += estado.sonicVelocidadeY * delta;
        estado.sonicPlaceholder.rotation.z += delta * 6;
        if (estado.sonicTempoMorte <= 0) _sonicRespawn();
        return; // salta restante lógica durante a morte
    }

    // Piscar durante invencibilidade
    if (estado.sonicInvencivel > 0) {
        estado.sonicInvencivel -= delta;
        var piscar = Math.floor(estado.sonicInvencivel * 8) % 2 === 0;
        if (estado.sonicPlaceholder) estado.sonicPlaceholder.visible = !estado.modoBola ? piscar : false;
        if (estado.sonicBola) estado.sonicBola.visible = estado.modoBola ? piscar : false;
        if (estado.sonicInvencivel <= 0) {
            if (estado.sonicPlaceholder) estado.sonicPlaceholder.visible = !estado.modoBola;
            if (estado.sonicBola) estado.sonicBola.visible = estado.modoBola;
        }
    }

    // Trigger do loop
    if (!estado.modoLoop && !estado.sonicEmSalto && estado.sonicPlaceholder) {
        var pz = estado.sonicPlaceholder.position.z;
        var py = estado.sonicPlaceholder.position.y;
        if (pz <= estado.LOOP_CZ + 1.0 && pz > estado.LOOP_CZ - 2.0 && Math.abs(py - estado.CHAO_Y_SONIC) < 0.5) {
            estado.modoLoop = true;
            estado.loopAngulo = 0;
            estado.modoBola = false;
            estado.sonicPlaceholder.visible = true;
            if (estado.sonicBola) estado.sonicBola.visible = false;
        }
    }

    // Física do loop (movimento circular automático)
    if (estado.modoLoop && estado.sonicPlaceholder) {
        var velAng = 1.8 + (estado.teclasPremidas.w ? 0.5 : 0);
        estado.loopAngulo += velAng * delta;

        estado.sonicPlaceholder.position.z = estado.LOOP_CZ - estado.LOOP_RAIO * Math.sin(estado.loopAngulo);
        estado.sonicPlaceholder.position.y = estado.LOOP_CY - estado.LOOP_RAIO * Math.cos(estado.loopAngulo);
        estado.sonicPlaceholder.position.x *= 0.9;
        estado.sonicPlaceholder.rotation.x = estado.loopAngulo;
        estado.sonicPlaceholder.rotation.z = 0;

        if (estado.sonicBola) estado.sonicBola.position.copy(estado.sonicPlaceholder.position);

        if (estado.loopAngulo >= Math.PI * 2) {
            estado.modoLoop = false;
            estado.loopAngulo = 0;
            estado.sonicPlaceholder.position.z = estado.LOOP_CZ - 3.0; // fora da zona de trigger (> LOOP_CZ - 2.0)
            estado.sonicPlaceholder.position.y = estado.CHAO_Y_SONIC;
            estado.sonicPlaceholder.rotation.x = 0;
        }
        return; // câmara livre e colisão não correm durante o loop
    }

    // Animação dos membros (pivot nos ombros e ancas)
    if (!estado.modoBola &&
        estado.sonicPartes.pivBracoEsq && estado.sonicPartes.pivBracoDir &&
        estado.sonicPartes.pivPernaEsq && estado.sonicPartes.pivPernaDir) {
        if (estado.sonicEmSalto) {
            estado.sonicPartes.pivBracoEsq.rotation.x = -1.0;
            estado.sonicPartes.pivBracoDir.rotation.x = -1.0;
            estado.sonicPartes.pivPernaEsq.rotation.x =  0.6;
            estado.sonicPartes.pivPernaDir.rotation.x =  0.6;
        } else {
            var fase = tempo * 8;
            if (estado.sonicEmMovimento) {
                estado.sonicPartes.pivBracoEsq.rotation.x =  Math.sin(fase) * 0.7;
                estado.sonicPartes.pivBracoDir.rotation.x = -Math.sin(fase) * 0.7;
                estado.sonicPartes.pivPernaEsq.rotation.x =  Math.sin(fase) * 0.9;
                estado.sonicPartes.pivPernaDir.rotation.x = -Math.sin(fase) * 0.9;
                estado.sonicPlaceholder.position.y = estado.CHAO_Y_SONIC + Math.abs(Math.sin(fase)) * 0.07;
            } else {
                estado.sonicPartes.pivBracoEsq.rotation.x = 0;
                estado.sonicPartes.pivBracoDir.rotation.x = 0;
                estado.sonicPartes.pivPernaEsq.rotation.x = 0;
                estado.sonicPartes.pivPernaDir.rotation.x = 0;
                estado.sonicPlaceholder.position.y = estado.CHAO_Y_SONIC;
            }
        }
    }

    // Física do salto
    if (estado.sonicEmSalto && estado.sonicPlaceholder && !estado.modoBola) {
        estado.sonicVelocidadeY += estado.GRAVIDADE * delta;
        estado.sonicPlaceholder.position.y += estado.sonicVelocidadeY * delta;
        if (estado.sonicPlaceholder.position.y <= estado.CHAO_Y_SONIC) {
            estado.sonicPlaceholder.position.y = estado.CHAO_Y_SONIC;
            estado.sonicVelocidadeY = 0;
            estado.sonicEmSalto = false;
            // Aterrou → transformar em bola
            estado.modoBola = true;
            estado.sonicPlaceholder.visible = false;
            if (estado.sonicBola) {
                var raio = estado.sonicBola.userData.raio || 0.7;
                estado.sonicBola.position.set(
                    estado.sonicPlaceholder.position.x,
                    estado.CHAO_Y_SONIC + raio,
                    estado.sonicPlaceholder.position.z
                );
                estado.sonicBola.visible = true;
            }
        }
    }

    // Movimento WASD
    if (estado.sonicPlaceholder && !estado.modoCamaraLivre) {
        var vel = 8 * delta;
        var movX = 0, movZ = 0;
        if (estado.modoCamara === 'ortografica') {
            if (estado.teclasPremidas.w) movZ += vel;
            if (estado.teclasPremidas.s) movZ -= vel;
        } else {
            if (estado.teclasPremidas.w) movZ -= vel;
            if (estado.teclasPremidas.s) movZ += vel;
        }
        if (estado.teclasPremidas.a) movX -= vel;
        if (estado.teclasPremidas.d) movX += vel;

        var estaAMover = (movX !== 0 || movZ !== 0) && !estado.modoBola && !estado.sonicEmSalto;
        if (estaAMover !== estado.sonicEmMovimento) {
            estado.sonicEmMovimento = estaAMover;
            _tocarAnimacaoSonic(estaAMover ? 'run' : 'idle');
        }

        if (movX !== 0 || movZ !== 0) {
            var nx = Math.max(-5, Math.min(5,   estado.sonicPlaceholder.position.x + movX));
            var nz = Math.max(-86, Math.min(40, estado.sonicPlaceholder.position.z + movZ));

            estado.sonicPlaceholder.position.x = nx;
            estado.sonicPlaceholder.position.z = nz;

            if (estado.sonicBola) {
                estado.sonicBola.position.x = nx;
                estado.sonicBola.position.z = nz;
                var raioB = estado.sonicBola.userData.raio || 0.7;
                estado.sonicBola.position.y = 0.35 + raioB;

                if (estado.modoBola) {
                    var velocidadeRot = Math.sqrt(movX * movX + movZ * movZ);
                    estado.sonicBola.rotation.z += velocidadeRot * 5;
                } else {
                    estado.sonicPlaceholder.rotation.y = Math.atan2(movX, movZ);
                }
            } else {
                estado.sonicPlaceholder.rotation.y = Math.atan2(movX, movZ);
            }
        }
    }

    // Animação tufos de relva: brisa suave + reação ao Sonic
    if (estado.tufosRelva.length > 0) {
        var posSonicTufo = estado.sonicPlaceholder ? estado.sonicPlaceholder.position : null;
        var raioSonicRelva = 2.8;
        var sonicWX = posSonicTufo ? posSonicTufo.x : 0;
        var sonicWZ = posSonicTufo ? posSonicTufo.z : 0;
        var CULL_R2 = 35 * 35;
        for (var tr = 0; tr < estado.tufosRelva.length; tr++) {
            var tufo = estado.tufosRelva[tr];
            var tdx = tufo.userData.worldX - sonicWX;
            var tdz = tufo.userData.worldZ - sonicWZ;
            var td2 = tdx * tdx + tdz * tdz;

            if (td2 > CULL_R2) continue;

            var brisaX = Math.sin(tempo * 1.8 + tufo.userData.faseBrisa) * 0.07;
            var brisaZ = Math.cos(tempo * 1.3 + tufo.userData.faseBrisa * 0.7) * 0.04;

            if (td2 < raioSonicRelva * raioSonicRelva) {
                var tdist = Math.sqrt(td2) + 0.001;
                var forca = (1.0 - tdist / raioSonicRelva) * 0.55;
                brisaX += (tdx / tdist) * forca;
                brisaZ += (tdz / tdist) * forca;
            } else {
                tufo.rotation.x *= 0.88;
                tufo.rotation.z *= 0.88;
            }

            tufo.rotation.x = brisaX;
            tufo.rotation.z = brisaZ;
        }
    }
}
