# Post Semanal — Semana 2 (20 – 27 Abril)

**Projeto:** Retro Gaming – Sonic the Hedgehog (Green Hill Zone)
**Tecnologia:** Three.js v0.165.0 via CDN

> **Nota:** Esta semana foi realizado o trabalho correspondente à **Sem. 0/1** (Setup do ambiente) e à **Sem. 2** (Objetos complexos), recuperando a planificação da semana anterior.

---

## 1. Progresso realizado na semana por aluno

### Aluno 1 — [Nome]

**Sem. 0/1 — Setup do Ambiente:**
- Criação da estrutura do projeto (`index.html` + `JavaScript/appThree.js`) seguindo o modelo das aulas práticas, com `importmap` para carregar Three.js via CDN.
- Inicialização da `THREE.Scene`, `THREE.WebGLRenderer` (antialiasing, `SRGBColorSpace`, `PCFSoftShadowMap`) e `THREE.PerspectiveCamera`.
- Implementação do loop de renderização com `requestAnimationFrame` e `THREE.Clock` para controlo de delta time.
- Criação do chão xadrez: `PlaneGeometry` (60×60) com textura procedural gerada via `CanvasTexture` (Canvas 2D API), padrão de xadrez em tons castanhos com `RepeatWrapping` 8×8.
- Construção do skybox retro: fundo azul céu, sol (`CircleGeometry`), 7 montanhas (`ConeGeometry` em dois tons de verde) e 4 nuvens animadas (cada uma é um `THREE.Group` com 3 `SphereGeometry`).
- Sistema de iluminação base: `AmbientLight` + `DirectionalLight` com `castShadow` e shadow camera configurada.

### Aluno 2 — [Nome]

**Sem. 2 — Objetos Complexos:**
- Construção do **Looping** (`criarLooping`): objeto central como `THREE.Group`, composto por percurso circular (`CatmullRomCurve3`, 64 pontos), pista tubular (`TubeGeometry`, 128 segmentos), 16 suportes metálicos (`CylinderGeometry`) orientados pela tangente via `Quaternion`, e 2 rampas de entrada/saída (`BoxGeometry`).
- Construção das **Palmeiras Retro** (`criarPalmeira`): cada palmeira é um `THREE.Group` com tronco (8 segmentos de `CylinderGeometry` empilhados, raio decrescente, rotações orgânicas) e 6 folhas (`PlaneGeometry` com vértices deformados programaticamente). 6 palmeiras posicionadas pelo cenário.
- Construção dos **Anéis** (`criarAneis`): 8 anéis distribuídos pela cena, cada um como `THREE.Group` com `TorusGeometry` + `MeshPhysicalMaterial` (metalness 0.9, clearcoat, reflectivity) e torus interior luminoso. Animação de rotação contínua.
- Construção do **Sonic Placeholder** (`criarSonicPlaceholder`): `THREE.Group` com `SphereGeometry` (corpo + barriga), 5 `ConeGeometry` (espinhos) e 2 `BoxGeometry` (sapatos vermelhos).

---

## 2. Desvios face à planificação anterior

- O trabalho da **Sem. 0/1** (setup do ambiente) não foi iniciado na semana de 13–20 abril, tendo sido realizado em conjunto com a **Sem. 2** na semana de 20–27 abril.
- Apesar deste atraso inicial, **ambas as semanas foram concluídas na totalidade** dentro do prazo da Sem. 2, pelo que o projeto está agora alinhado com a calendarização prevista.
- Não houve alterações ao âmbito ou funcionalidades previstas — todos os objetivos das Sem. 0/1 e Sem. 2 foram cumpridos conforme o planeado.

---

## 3. Auto-avaliação do progresso semanal por aluno

### Aluno 1 — [Nome]
- **Avaliação:** Bom. O setup do ambiente foi concluído com sucesso, incluindo elementos visuais além do mínimo (skybox com montanhas e nuvens animadas, sombras configuradas). O modelo das aulas práticas foi seguido fielmente.
- **Dificuldades:** Configuração inicial do `shadowMap` e dimensionamento correto da shadow camera para cobrir toda a cena.

### Aluno 2 — [Nome]
- **Avaliação:** Bom. Todos os objetos complexos foram construídos com primitivas e organizados em hierarquias de `THREE.Group`, demonstrando o conceito de Scene Graph. O looping foi o elemento mais desafiante.
- **Dificuldades:** Orientação dos suportes do looping ao longo da curva (resolução via `Quaternion.setFromUnitVectors`) e deformação programática dos vértices das folhas das palmeiras.

---

## 4. Evidências dos progressos

### Ficheiros criados/modificados

| Ficheiro | Descrição |
| --- | --- |
| `index.html` | Página HTML com `importmap` para Three.js via CDN |
| `JavaScript/appThree.js` | Módulo principal (~580 linhas) com toda a lógica da cena |
| `assets/` | Pasta preparada para texturas locais futuras |

### Funções implementadas em `appThree.js`

**Sem. 0/1 (Setup):**
- `criarTexturaXadrez()` — textura procedural xadrez via Canvas 2D
- `criarChao()` — plano horizontal com textura xadrez
- `criarSkyboxRetro()` — sol, montanhas, nuvens animadas
- `criarLuzes()` — AmbientLight + DirectionalLight com sombras
- `atualizarDimensoes()` — redimensionamento responsivo
- `loop()` — ciclo de renderização com delta time
- `Start()` — inicialização geral

**Sem. 2 (Objetos complexos):**
- `criarLooping()` — looping com CatmullRomCurve3 + TubeGeometry + suportes
- `criarPalmeira(posX, posZ)` — palmeira parametrizada com tronco + folhas
- `criarPalmeiras()` — posicionamento de 6 palmeiras
- `criarAneis()` — 8 anéis com MeshPhysicalMaterial
- `criarSonicPlaceholder()` — personagem simplificado com primitivas

### Conceitos de CG demonstrados
- Scene Graph e hierarquia de objetos (`THREE.Group`)
- Rendering pipeline (Scene → Camera → Renderer)
- Câmara perspetiva e projeção
- Texturas procedurais (`CanvasTexture`, `RepeatWrapping`)
- Shadow Mapping (`PCFSoftShadowMap`, `castShadow`, `receiveShadow`)
- Curvas paramétricas (`CatmullRomCurve3`) e extrusão (`TubeGeometry`)
- Deformação de vértices (folhas das palmeiras)
- Orientação por quaterniões (suportes do looping)
- Materiais PBR (`MeshPhysicalMaterial` — metalness, clearcoat, reflectivity)

### Capturas de ecrã

> *Inserir aqui capturas de ecrã das diferentes perspetivas (teclas 1-6):*
>
> - [ ] **Vista frontal** (tecla 1) — vista geral da cena
> - [ ] **Vista lateral direita** (tecla 2) — perfil do looping
> - [ ] **Vista lateral esquerda** (tecla 3) — perfil com palmeiras
> - [ ] **Vista aérea** (tecla 4) — disposição dos elementos no cenário
> - [ ] **Vista traseira** (tecla 5) — montanhas e skybox
> - [ ] **Vista diagonal 3/4** (tecla 6) — vista de apresentação

---

## 5. Planificação semana(s) seguinte(s)

### Sem. 3 (27 Abr – 4 Mai) — Texturização

- Aplicação de texturas externas via `TextureLoader` aos objetos existentes (looping, palmeiras, chão).
- Mapeamento UV para garantir o aspeto visual dos jogos clássicos (Sonic 1/2/CD na Mega Drive).
- Importação de imagens para a pasta `assets/` (texturas de relva, madeira, metal).
- Possível melhoria do skybox com texturas ou gradientes mais detalhados.
- Início da exploração de `alphaMap` para transparência nas folhas das palmeiras.

### Sem. 4 (4 – 11 Mai) — Câmaras

- Implementação de câmara ortográfica para vista lateral side-scrolling.
- Sistema de alternância dinâmica entre perspetiva e ortográfica.
