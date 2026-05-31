// sistema.js — Timer, Coleta de Anéis, Ecrã de Resultados e CSV
import { estado } from './estado.js';

var _labelTempo  = null;
var _labelAneis  = null;
var _TOTAL_ANEIS = 21;      // atualizado em inicializarSistema()
var _RAIO_COLETA = 1.6;     // distância XZ para apanhar um anel
var _CSV_KEY     = 'sonicRetro_historico';

// ============================================================
// Formatação de tempo  MM:SS.ms
// ============================================================
function _fmt(seg) {
    var m  = Math.floor(seg / 60);
    var s  = Math.floor(seg % 60);
    var ms = Math.floor((seg % 1) * 100);
    return (m < 10 ? '0' : '') + m + ':'
         + (s < 10 ? '0' : '') + s + '.'
         + (ms < 10 ? '0' : '') + ms;
}

// ============================================================
// Inicialização: apenas HUD do timer (anéis só no ecrã final)
// ============================================================
export function inicializarSistema() {
    _TOTAL_ANEIS = estado.aneisDecorativos.length || 21;

    for (var i = 0; i < estado.aneisDecorativos.length; i++) {
        estado.aneisDecorativos[i].userData.coletado = false;
    }
    estado.aneisColecionados = 0;
    estado.tempoNivel        = 0;
    estado.nivelAtivo        = true;
    estado.nivelConcluido    = false;

    // HUD — timer (topo direito)
    _labelTempo = document.createElement('div');
    _labelTempo.style.cssText = [
        'position:fixed;top:10px;right:10px;',
        'background:rgba(0,0,0,0.72);',
        'color:#00ffcc;',
        'padding:7px 16px;',
        'font-family:monospace;font-size:21px;',
        'border-radius:7px;letter-spacing:2px;',
        'z-index:100;pointer-events:none;'
    ].join('');
    _labelTempo.textContent = '00:00.00';
    document.body.appendChild(_labelTempo);

    // HUD — anéis (abaixo do timer)
    _labelAneis = document.createElement('div');
    _labelAneis.style.cssText = [
        'position:fixed;top:55px;right:10px;',
        'background:rgba(0,0,0,0.72);',
        'color:#ffcc33;',
        'padding:5px 16px;',
        'font-family:monospace;font-size:17px;',
        'border-radius:7px;letter-spacing:2px;',
        'z-index:100;pointer-events:none;'
    ].join('');
    _labelAneis.textContent = '⬡ 0 / ' + _TOTAL_ANEIS;
    document.body.appendChild(_labelAneis);

    estado._callbacks.resetarHUDAneis = function() {
        if (_labelAneis) _labelAneis.textContent = '⬡ 0 / ' + _TOTAL_ANEIS;
    };
}

// ============================================================
// Atualização por frame
// ============================================================
export function atualizarSistema(delta) {
    if (estado.nivelConcluido) return;

    // Timer — pausa durante animação de morte
    if (estado.nivelAtivo && !estado.sonicMorreu) {
        estado.tempoNivel += delta;
    }
    if (_labelTempo) _labelTempo.textContent = _fmt(estado.tempoNivel);

    // Coleta de anéis (sem HUD — só conta internamente)
    if (estado.sonicPlaceholder) {
        var px = estado.sonicPlaceholder.position.x;
        var pz = estado.sonicPlaceholder.position.z;
        for (var i = 0; i < estado.aneisDecorativos.length; i++) {
            var anel = estado.aneisDecorativos[i];
            if (anel.userData.coletado) continue;
            var dx = anel.position.x - px;
            var dz = anel.position.z - pz;
            if (dx * dx + dz * dz < _RAIO_COLETA * _RAIO_COLETA) {
                anel.userData.coletado = true;
                anel.visible = false;
                estado.aneisColecionados++;
                if (_labelAneis) _labelAneis.textContent = '⬡ ' + estado.aneisColecionados + ' / ' + _TOTAL_ANEIS;
            }
        }
    }

    // Deteção de chegada ao Goal Post
    if (estado.sonicPlaceholder && !estado.sonicMorreu) {
        var sx = estado.sonicPlaceholder.position.x;
        var sz = estado.sonicPlaceholder.position.z;
        for (var ck = 0; ck < estado.elementosNivel.length; ck++) {
            var el = estado.elementosNivel[ck];
            if (el.tipo !== 'placaFinal') continue;
            var ep = el.grupo.position;
            var d2 = (sx - ep.x) * (sx - ep.x) + (sz - ep.z) * (sz - ep.z);
            if (d2 < 3.5 * 3.5) {
                _concluirNivel();
                break;
            }
        }
    }
}

// ============================================================
// Conclusão do nível
// ============================================================
function _concluirNivel() {
    if (estado.nivelConcluido) return;
    estado.nivelConcluido = true;
    estado.nivelAtivo     = false;

    var tempo = estado.tempoNivel;
    var aneis = estado.aneisColecionados;

    // Verificar record ANTES de inserir no histórico
    var hist        = _carregarHistorico();
    var melhorAntes = hist.reduce(function(m, h) { return h.tempo < m ? h.tempo : m; }, Infinity);
    var eRecord     = hist.length === 0 || tempo < melhorAntes;
    var melhorMostrar = eRecord ? tempo : melhorAntes;

    // Guardar em localStorage (persiste entre sessões)
    _guardarHistorico(tempo, aneis, eRecord);

    // Mostrar ecrã de resultados após pausa dramática; CSV descarregado junto
    setTimeout(function() {
        _mostrarResultados(tempo, aneis, eRecord, melhorMostrar);
        _descarregarCSV();
    }, 900);
}

// ============================================================
// localStorage — histórico persistente entre sessões
// ============================================================
function _carregarHistorico() {
    try {
        var raw = localStorage.getItem(_CSV_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function _guardarHistorico(tempo, aneis, eRecord) {
    var hist  = _carregarHistorico();
    var agora = new Date();
    hist.unshift({
        data:           agora.toLocaleDateString('pt-PT'),
        hora:           agora.toLocaleTimeString('pt-PT'),
        tempo:          Math.round(tempo * 1000) / 1000,
        tempoFormatado: _fmt(tempo),
        aneis:          aneis,
        totalAneis:     _TOTAL_ANEIS,
        record:         eRecord ? 'Sim' : 'Não'
    });
    if (hist.length > 100) hist = hist.slice(0, 100);
    try { localStorage.setItem(_CSV_KEY, JSON.stringify(hist)); } catch (e) {}
}

function _gerarCSV() {
    var hist   = _carregarHistorico();
    var linhas = ['data,hora,tempo_segundos,tempo_formatado,aneis,total_aneis,record'];
    for (var i = 0; i < hist.length; i++) {
        var h = hist[i];
        linhas.push([h.data, h.hora, h.tempo, h.tempoFormatado, h.aneis, h.totalAneis, h.record].join(','));
    }
    return linhas.join('\n');
}

function _descarregarCSV() {
    var csv  = _gerarCSV();
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href         = url;
    a.download     = 'sonic_retro_tempos.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 200);
}

// ============================================================
// Ecrã de Resultados
// ============================================================
function _mostrarResultados(tempo, aneis, eRecord, melhorTempo) {
    var overlay = document.createElement('div');
    overlay.style.cssText = [
        'position:fixed;top:0;left:0;width:100%;height:100%;',
        'background:rgba(0,4,20,0.90);',
        'display:flex;align-items:center;justify-content:center;',
        'z-index:9000;pointer-events:all;',
        'animation:fadeInOverlay 0.5s ease;'
    ].join('');

    var recordHTML = eRecord
        ? '<div class="sr-record">★ NOVO RECORD! ★</div>'
        : '<div class="sr-best">Melhor tempo: ' + _fmt(melhorTempo) + '</div>';

    var percentAneis = Math.round((aneis / _TOTAL_ANEIS) * 100);

    overlay.innerHTML = [
        '<div class="sr-card">',

            '<div class="sr-label-top">SONIC RETRO</div>',
            '<div class="sr-title">NÍVEL CONCLUÍDO!</div>',
            '<div class="sr-sep"></div>',

            // Tempo
            '<div class="sr-section">',
                '<div class="sr-key">TEMPO</div>',
                '<div class="sr-time">', _fmt(tempo), '</div>',
                recordHTML,
            '</div>',

            // Rings
            '<div class="sr-section sr-rings-section">',
                '<div class="sr-key">RINGS</div>',
                '<div class="sr-rings-val">',
                    '<span class="sr-rings-n">', aneis, '</span>',
                    '<span class="sr-rings-total"> / ', _TOTAL_ANEIS, '</span>',
                '</div>',
                '<div class="sr-bar-wrap">',
                    '<div class="sr-bar-fill" style="width:', percentAneis, '%"></div>',
                '</div>',
                '<div class="sr-rings-pct">', percentAneis, '%</div>',
            '</div>',

            '<div class="sr-sep"></div>',

            // Botões
            '<div class="sr-btns">',
                '<button class="sr-btn sr-btn-primary" id="sr-play-again" tabindex="-1">&#9654; JOGAR DE NOVO</button>',
                '<button class="sr-btn sr-btn-disabled" disabled tabindex="-1">NEXT LEVEL &#9655;</button>',
            '</div>',
            '<div class="sr-btns-sub">',
                '<button class="sr-btn sr-btn-csv" id="sr-csv" tabindex="-1">&#8595; Exportar CSV</button>',
            '</div>',

        '</div>',

        '<style>',
            '@keyframes fadeInOverlay{from{opacity:0}to{opacity:1}}',
            '@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}',
            '@keyframes pulse{from{opacity:.75;transform:scale(1)}to{opacity:1;transform:scale(1.05)}}',

            '.sr-card{background:linear-gradient(170deg,#071530 0%,#0c2040 100%);border:2px solid #1a6fff;border-radius:18px;padding:36px 52px 32px;text-align:center;min-width:360px;max-width:480px;box-shadow:0 0 50px rgba(26,111,255,.45),0 0 100px rgba(26,111,255,.15);animation:slideUp .45s cubic-bezier(.22,1,.36,1);font-family:monospace;}',

            '.sr-label-top{color:#4daaff;font-size:11px;letter-spacing:7px;margin-bottom:4px;}',
            '.sr-title{color:#fff;font-size:26px;font-weight:bold;letter-spacing:4px;margin-bottom:20px;}',
            '.sr-sep{border-top:1px solid rgba(26,111,255,.3);margin:18px 0;}',
            '.sr-section{margin-bottom:14px;}',
            '.sr-key{color:#556688;font-size:10px;letter-spacing:5px;margin-bottom:6px;}',

            '.sr-time{color:#00ffcc;font-size:46px;letter-spacing:5px;line-height:1;}',
            '.sr-record{color:#ffdd00;font-size:18px;margin-top:8px;letter-spacing:3px;animation:pulse .75s infinite alternate;}',
            '.sr-best{color:#557799;font-size:13px;margin-top:6px;}',

            '.sr-rings-section{background:rgba(255,204,51,.06);border:1px solid rgba(255,204,51,.18);border-radius:10px;padding:14px 20px;margin:16px 0;}',
            '.sr-rings-val{margin:4px 0 10px;}',
            '.sr-rings-n{color:#ffcc33;font-size:34px;}',
            '.sr-rings-total{color:#664d00;font-size:18px;}',
            '.sr-bar-wrap{background:#0a1628;border-radius:4px;height:6px;overflow:hidden;margin-bottom:5px;}',
            '.sr-bar-fill{background:linear-gradient(90deg,#ffcc33,#ff9900);height:100%;border-radius:4px;}',
            '.sr-rings-pct{color:#997a00;font-size:11px;letter-spacing:2px;}',

            '.sr-btns{display:flex;gap:10px;justify-content:center;margin-top:4px;}',
            '.sr-btns-sub{display:flex;justify-content:center;margin-top:10px;}',
            '.sr-btn{font-family:monospace;border:none;border-radius:8px;cursor:pointer;letter-spacing:2px;transition:all .15s;}',
            '.sr-btn-primary{background:#1a6fff;color:#fff;font-size:15px;padding:12px 26px;}',
            '.sr-btn-primary:hover{background:#2a80ff;transform:translateY(-1px);}',
            '.sr-btn-disabled{background:#0d1a0d;color:#334433;border:1px solid #1f2e1f;font-size:15px;padding:12px 22px;cursor:not-allowed;}',
            '.sr-btn-csv{background:transparent;color:#3a7acc;border:1px solid #1a4a99;font-size:12px;padding:8px 20px;}',
            '.sr-btn-csv:hover{background:rgba(26,111,255,.12);}',
        '</style>'
    ].join('');

    document.body.appendChild(overlay);

    // Garantir que nenhum botão recebe foco automático (evita Space acionar o reload)
    if (document.activeElement) document.activeElement.blur();

    document.getElementById('sr-play-again').addEventListener('click', function() { window.location.reload(); });
    document.getElementById('sr-csv').addEventListener('click', _descarregarCSV);
}
