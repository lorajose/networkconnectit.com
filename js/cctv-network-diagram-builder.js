// CCTV Network Diagram Builder
(function () {
    const svg = document.getElementById('cctvDiagramSvg');
    if (!svg) return;

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const DEFAULT_CANVAS_WIDTH = 1180;
    const DEFAULT_CANVAS_HEIGHT = 760;
    const POWER_DRAW_WATTS = {
        ipCamera: 8,
        ptzCamera: 20
    };

    // Stripe export is intentionally scaffolded here. Attach a Payment Link or
    // Checkout redirect later without changing the page structure.
    const PREMIUM_EXPORT_CONFIG = {
        bundlePaymentLink: '',
        unlockStorageKey: 'ncit-cctv-premium-export-unlocked',
        returnQueryParam: 'premiumExport',
        successValues: ['success', 'paid'],
        cancelValues: ['cancel', 'cancelled', 'canceled'],
        trustReturnQueryUnlock: false
    };

    const validationMessage = document.getElementById('diagramBuilderValidation');
    const canvasEmptyState = document.getElementById('diagramCanvasEmpty');
    const canvasShell = svg.closest('.diagram-canvas-shell');
    const summaryEmptyState = document.getElementById('diagramSummaryEmpty');
    const summaryContent = document.getElementById('diagramSummaryContent');
    const layoutStatus = document.getElementById('diagramLayoutStatus');
    const premiumExportStatus = document.getElementById('premiumExportStatus');
    const quantityInputs = Array.from(document.querySelectorAll('.diagram-qty-input'));

    const buildButton = document.getElementById('diagramBuildButton');
    const resetButton = document.getElementById('diagramResetButton');
    const autoLayoutButton = document.getElementById('diagramAutoLayoutButton');
    const clearCanvasButton = document.getElementById('diagramClearCanvasButton');
    const lockLayoutButton = document.getElementById('diagramLockLayoutButton');
    const unlockLayoutButton = document.getElementById('diagramUnlockLayoutButton');
    const unlockExportBundleButton = document.getElementById('unlockExportBundleButton');
    const premiumPngActionButton = document.getElementById('premiumPngActionButton');
    const premiumPdfActionButton = document.getElementById('premiumPdfActionButton');
    const premiumUnlockedExportPngButton = document.getElementById('premiumUnlockedExportPngButton');
    const premiumUnlockedExportPdfButton = document.getElementById('premiumUnlockedExportPdfButton');
    const premiumReturnToBuilderButton = document.getElementById('premiumReturnToBuilderButton');
    const premiumRetryCheckoutButton = document.getElementById('premiumRetryCheckoutButton');
    const premiumReturnToBuilderFromCancelButton = document.getElementById('premiumReturnToBuilderFromCancelButton');

    const premiumModalElement = document.getElementById('premiumExportModal');
    const premiumStateLocked = document.getElementById('premiumStateLocked');
    const premiumStateUnlocked = document.getElementById('premiumStateUnlocked');
    const premiumStateCancelled = document.getElementById('premiumStateCancelled');
    const premiumModalStatus = document.getElementById('premiumExportModalStatus');
    const premiumModalBody = document.getElementById('premiumExportModalBody');
    const premiumModalSecondary = document.getElementById('premiumExportModalSecondary');
    const premiumModalPlaceholderNote = document.getElementById('premiumExportModalPlaceholderNote');
    const premiumContinueCheckoutButton = document.getElementById('premiumContinueCheckoutButton');

    const summaryOutput = {
        totalCameras: document.getElementById('resultTotalCameras'),
        totalPoEEndpoints: document.getElementById('resultTotalPoEEndpoints'),
        totalSwitches: document.getElementById('resultTotalSwitches'),
        totalNVRs: document.getElementById('resultTotalNVRs'),
        estimatedPoeLoad: document.getElementById('resultEstimatedPoeLoad'),
        suggestedTopology: document.getElementById('resultSuggestedTopology'),
        topologyWarnings: document.getElementById('resultTopologyWarnings'),
        planningSummary: document.getElementById('resultPlanningSummary')
    };

    const DEVICE_CONFIG = {
        ipCamera: {
            label: 'IP Camera',
            shortLabel: 'IP',
            width: 148,
            height: 64,
            fill: '#0F766E',
            accent: '#2DD4FF',
            icon: 'CAM'
        },
        ptzCamera: {
            label: 'PTZ Camera',
            shortLabel: 'PTZ',
            width: 148,
            height: 64,
            fill: '#1D4ED8',
            accent: '#93C5FD',
            icon: 'PTZ'
        },
        poeSwitch: {
            label: 'PoE Switch',
            shortLabel: 'SW',
            width: 220,
            height: 76,
            fill: '#14532D',
            accent: '#9EFF00',
            icon: 'CORE'
        },
        nvr: {
            label: 'NVR',
            shortLabel: 'NVR',
            width: 196,
            height: 72,
            fill: '#4C1D95',
            accent: '#C4B5FD',
            icon: 'REC'
        },
        routerFirewall: {
            label: 'Router / Firewall',
            shortLabel: 'EDGE',
            width: 214,
            height: 72,
            fill: '#7C2D12',
            accent: '#FDBA74',
            icon: 'WAN'
        },
        ups: {
            label: 'UPS',
            shortLabel: 'UPS',
            width: 184,
            height: 68,
            fill: '#78350F',
            accent: '#FCD34D',
            icon: 'PWR'
        },
        workstation: {
            label: 'Workstation',
            shortLabel: 'WS',
            width: 176,
            height: 68,
            fill: '#1E293B',
            accent: '#94A3B8',
            icon: 'OPS'
        },
        monitor: {
            label: 'Monitor',
            shortLabel: 'MON',
            width: 166,
            height: 64,
            fill: '#111827',
            accent: '#67E8F9',
            icon: 'VIEW'
        }
    };

    let currentDiagram = null;
    let diagramDom = {
        connectionsLayer: null,
        nodesLayer: null,
        nodeGroups: new Map()
    };
    let layoutLocked = false;
    let dragState = null;
    let premiumModal = null;
    let premiumUnlocked = false;
    let premiumState = loadPremiumState();

    function loadPremiumState() {
        try {
            const params = new URLSearchParams(window.location.search);
            const checkoutState = String(params.get(PREMIUM_EXPORT_CONFIG.returnQueryParam) || '').toLowerCase();

            if (PREMIUM_EXPORT_CONFIG.trustReturnQueryUnlock && PREMIUM_EXPORT_CONFIG.successValues.indexOf(checkoutState) !== -1) {
                premiumUnlocked = true;
                try {
                    window.sessionStorage.setItem(PREMIUM_EXPORT_CONFIG.unlockStorageKey, 'true');
                } catch (storageError) {
                    // Ignore storage failures and keep the in-memory state only.
                }
            }

            if (!premiumUnlocked) {
                premiumUnlocked = window.sessionStorage.getItem(PREMIUM_EXPORT_CONFIG.unlockStorageKey) === 'true';
            }

            if (premiumUnlocked) {
                return 'unlocked';
            }

            if (PREMIUM_EXPORT_CONFIG.cancelValues.indexOf(checkoutState) !== -1) {
                return 'cancelled';
            }
        } catch (error) {
            premiumUnlocked = false;
        }

        return premiumUnlocked ? 'unlocked' : 'locked';
    }

    function setPremiumUnlockState(value) {
        premiumUnlocked = Boolean(value);

        try {
            if (premiumUnlocked) {
                window.sessionStorage.setItem(PREMIUM_EXPORT_CONFIG.unlockStorageKey, 'true');
            } else {
                window.sessionStorage.removeItem(PREMIUM_EXPORT_CONFIG.unlockStorageKey);
            }
        } catch (error) {
            // Ignore storage failures and keep the in-memory state only.
        }

        premiumState = premiumUnlocked ? 'unlocked' : 'locked';
        updatePremiumUi();
    }

    function setPremiumState(nextState) {
        premiumState = premiumUnlocked ? 'unlocked' : nextState;
        updatePremiumUi();
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeQuantity(value) {
        const parsed = Number(value);

        if (Number.isNaN(parsed) || parsed < 0) {
            return 0;
        }

        return Math.floor(parsed);
    }

    function getBuilderState() {
        const state = {};

        quantityInputs.forEach(function (input) {
            state[input.dataset.deviceType] = sanitizeQuantity(input.value);
        });

        return state;
    }

    function setValidation(message) {
        validationMessage.textContent = message;
        validationMessage.classList.remove('d-none');
    }

    function clearValidation() {
        validationMessage.classList.add('d-none');
    }

    function getCameraCount(state) {
        return state.ipCamera + state.ptzCamera;
    }

    function hasCoreInfrastructure(state) {
        return state.poeSwitch > 0 || state.nvr > 0;
    }

    function validateBuilderState(state) {
        if (getCameraCount(state) < 1 || !hasCoreInfrastructure(state)) {
            setValidation('Please add at least one camera and core infrastructure components to build a practical diagram.');
            return false;
        }

        clearValidation();
        return true;
    }

    function formatPoeLoad(state) {
        const watts = (state.ipCamera * POWER_DRAW_WATTS.ipCamera) + (state.ptzCamera * POWER_DRAW_WATTS.ptzCamera);
        return `${watts} W estimated`;
    }

    function getSuggestedTopology(state, cameraCount) {
        if (cameraCount <= 8 && state.poeSwitch === 1) {
            return 'Small single-switch CCTV topology';
        }

        if (cameraCount > 8 && state.poeSwitch >= 2) {
            return 'Distributed CCTV topology';
        }

        if (cameraCount > 0 && state.nvr === 0) {
            return 'Topology incomplete: NVR recommended';
        }

        if (state.nvr > 0 && state.ups === 0) {
            return 'Standard CCTV topology, but UPS protection is recommended';
        }

        return 'Standard centralized CCTV topology';
    }

    function getTopologyWarnings(state, cameraCount) {
        const warnings = [];

        if (cameraCount > 0 && state.poeSwitch === 0) {
            warnings.push('Cameras are present but no PoE switch is defined.');
        }

        if (cameraCount > 0 && state.nvr === 0) {
            warnings.push('No NVR is defined for recording topology.');
        }

        if (state.nvr > 0 && state.ups === 0) {
            warnings.push('UPS protection is recommended for core recording and switching equipment.');
        }

        if (state.monitor > 0 && state.workstation === 0 && state.nvr === 0) {
            warnings.push('Monitor placement is defined without a clear viewing endpoint.');
        }

        if (!warnings.length) {
            warnings.push('No major topology warnings under current assumptions.');
        }

        return warnings;
    }

    function buildPlanningSummary(state, cameraCount, poeLoadText) {
        return `This diagram represents a practical starting point for a CCTV deployment with approximately ${cameraCount} camera endpoint(s), ${state.poeSwitch} PoE switch(es), and ${state.nvr} recording device(s). Estimated PoE demand is ${poeLoadText}. Review switch capacity, recording requirements, uplink design, cable routing, and field conditions before final deployment.`;
    }

    function calculateSummary(state) {
        const cameraCount = getCameraCount(state);
        const poeLoadText = formatPoeLoad(state);
        const warnings = getTopologyWarnings(state, cameraCount);

        return {
            totalCameras: cameraCount,
            totalPoEEndpoints: cameraCount,
            totalSwitches: state.poeSwitch,
            totalNVRs: state.nvr,
            estimatedPoeLoad: poeLoadText,
            suggestedTopology: getSuggestedTopology(state, cameraCount),
            warnings: warnings,
            planningSummary: buildPlanningSummary(state, cameraCount, poeLoadText)
        };
    }

    function resetSummary() {
        summaryOutput.totalCameras.textContent = '-';
        summaryOutput.totalPoEEndpoints.textContent = '-';
        summaryOutput.totalSwitches.textContent = '-';
        summaryOutput.totalNVRs.textContent = '-';
        summaryOutput.estimatedPoeLoad.textContent = '-';
        summaryOutput.suggestedTopology.textContent = '-';
        summaryOutput.topologyWarnings.innerHTML = '-';
        summaryOutput.planningSummary.textContent = '-';
    }

    function renderWarnings(warnings) {
        if (warnings.length === 1 && warnings[0] === 'No major topology warnings under current assumptions.') {
            return `<p class="tool-result-text mb-0">${escapeHtml(warnings[0])}</p>`;
        }

        return `
            <ul class="diagram-warning-list mb-0">
                ${warnings.map(function (warning) {
                    return `<li>${escapeHtml(warning)}</li>`;
                }).join('')}
            </ul>
        `;
    }

    function updateSummary(summary) {
        summaryOutput.totalCameras.textContent = String(summary.totalCameras);
        summaryOutput.totalPoEEndpoints.textContent = String(summary.totalPoEEndpoints);
        summaryOutput.totalSwitches.textContent = String(summary.totalSwitches);
        summaryOutput.totalNVRs.textContent = String(summary.totalNVRs);
        summaryOutput.estimatedPoeLoad.textContent = summary.estimatedPoeLoad;
        summaryOutput.suggestedTopology.textContent = summary.suggestedTopology;
        summaryOutput.topologyWarnings.innerHTML = renderWarnings(summary.warnings);
        summaryOutput.planningSummary.textContent = summary.planningSummary;
    }

    function createNodesForType(type, quantity) {
        const config = DEVICE_CONFIG[type];
        const nodes = [];

        for (let index = 0; index < quantity; index += 1) {
            nodes.push({
                id: `${type}-${index + 1}`,
                type: type,
                width: config.width,
                height: config.height,
                label: quantity > 1 ? `${config.label} ${index + 1}` : config.label,
                sequence: index + 1,
                x: 0,
                y: 0
            });
        }

        return nodes;
    }

    function getCameraColumnCount(cameraCount) {
        if (cameraCount >= 25) {
            return 4;
        }

        if (cameraCount >= 13) {
            return 3;
        }

        if (cameraCount >= 7) {
            return 2;
        }

        return 1;
    }

    function getCanvasMetrics(state) {
        const cameraCount = getCameraCount(state);
        const cameraColumns = getCameraColumnCount(cameraCount);
        const cameraRows = Math.max(1, Math.ceil(Math.max(cameraCount, 1) / cameraColumns));
        const switchRows = Math.max(1, state.poeSwitch);
        const supportRows = Math.max(
            Math.max(1, state.nvr) + Math.max(1, state.ups),
            Math.max(1, state.workstation) + Math.max(1, state.monitor)
        );
        const zoneHeight = Math.max(
            560,
            (cameraRows * 86) + 74,
            (switchRows * 96) + 176,
            (supportRows * 84) + 92
        );
        const leftZoneWidth = Math.max(300, (cameraColumns * 166) + ((cameraColumns - 1) * 22) + 38);
        const centerZoneWidth = Math.max(320, state.poeSwitch > 3 ? 360 : 320);
        const rightZoneWidth = 484;
        const marginX = 34;
        const gap = 26;
        const zoneY = 108;
        const canvasWidth = Math.max(
            DEFAULT_CANVAS_WIDTH,
            (marginX * 2) + leftZoneWidth + centerZoneWidth + rightZoneWidth + (gap * 2)
        );
        const canvasHeight = Math.max(DEFAULT_CANVAS_HEIGHT, zoneY + zoneHeight + 96);

        const cameraZone = {
            x: marginX,
            y: zoneY,
            width: leftZoneWidth,
            height: zoneHeight
        };
        const coreZone = {
            x: cameraZone.x + cameraZone.width + gap,
            y: zoneY,
            width: centerZoneWidth,
            height: zoneHeight
        };
        const supportZone = {
            x: coreZone.x + coreZone.width + gap,
            y: zoneY,
            width: rightZoneWidth,
            height: zoneHeight
        };

        return {
            width: canvasWidth,
            height: canvasHeight,
            cameraColumns: cameraColumns,
            cameraRows: cameraRows,
            zones: {
                camera: cameraZone,
                core: coreZone,
                support: supportZone
            }
        };
    }

    function distributeInZone(nodes, options) {
        if (!nodes.length) {
            return;
        }

        const columns = Math.min(options.maxColumns, Math.max(1, Math.ceil(nodes.length / options.preferredRows)));
        const rows = Math.ceil(nodes.length / columns);
        const columnWidth = options.columnWidth;
        const rowHeight = options.rowHeight;
        const totalWidth = (columns * columnWidth) + ((columns - 1) * options.columnGap);
        const startX = options.x + Math.max(0, Math.round((options.width - totalWidth) / 2));
        const totalHeight = (rows * rowHeight) + ((rows - 1) * options.rowGap);
        const startY = options.y + Math.max(0, Math.round((options.height - totalHeight) / 2));

        nodes.forEach(function (node, index) {
            const row = index % rows;
            const column = Math.floor(index / rows);

            node.x = startX + (column * (columnWidth + options.columnGap)) + Math.round((columnWidth - node.width) / 2);
            node.y = startY + (row * (rowHeight + options.rowGap)) + Math.round((rowHeight - node.height) / 2);
        });
    }

    function buildAutoLayout(state, summary) {
        const nodes = []
            .concat(createNodesForType('ipCamera', state.ipCamera))
            .concat(createNodesForType('ptzCamera', state.ptzCamera))
            .concat(createNodesForType('poeSwitch', state.poeSwitch))
            .concat(createNodesForType('nvr', state.nvr))
            .concat(createNodesForType('routerFirewall', state.routerFirewall))
            .concat(createNodesForType('ups', state.ups))
            .concat(createNodesForType('workstation', state.workstation))
            .concat(createNodesForType('monitor', state.monitor));

        const nodesByType = {
            cameras: nodes.filter(function (node) {
                return node.type === 'ipCamera' || node.type === 'ptzCamera';
            }),
            switches: nodes.filter(function (node) {
                return node.type === 'poeSwitch';
            }),
            nvrs: nodes.filter(function (node) {
                return node.type === 'nvr';
            }),
            routers: nodes.filter(function (node) {
                return node.type === 'routerFirewall';
            }),
            ups: nodes.filter(function (node) {
                return node.type === 'ups';
            }),
            workstations: nodes.filter(function (node) {
                return node.type === 'workstation';
            }),
            monitors: nodes.filter(function (node) {
                return node.type === 'monitor';
            })
        };
        const canvas = getCanvasMetrics(state);
        const cameraZone = canvas.zones.camera;
        const coreZone = canvas.zones.core;
        const supportZone = canvas.zones.support;
        const supportColumnGap = 20;
        const supportColumnWidth = Math.max(196, Math.floor((supportZone.width - 54 - supportColumnGap) / 2));
        const supportTopHeight = Math.max(190, Math.round((supportZone.height - 54) / 2));
        const supportBottomY = supportZone.y + 18 + supportTopHeight + 18;
        const supportBottomHeight = supportZone.height - supportTopHeight - 54;

        distributeInZone(nodesByType.cameras, {
            x: cameraZone.x + 16,
            y: cameraZone.y + 20,
            width: cameraZone.width - 32,
            height: cameraZone.height - 40,
            maxColumns: canvas.cameraColumns,
            preferredRows: canvas.cameraRows,
            columnWidth: 156,
            rowHeight: 76,
            columnGap: 22,
            rowGap: 14
        });

        distributeInZone(nodesByType.switches, {
            x: coreZone.x + 24,
            y: coreZone.y + 136,
            width: coreZone.width - 48,
            height: coreZone.height - 168,
            maxColumns: 1,
            preferredRows: Math.max(2, state.poeSwitch),
            columnWidth: 228,
            rowHeight: 94,
            columnGap: 0,
            rowGap: 18
        });

        distributeInZone(nodesByType.routers, {
            x: coreZone.x + 22,
            y: coreZone.y + 16,
            width: coreZone.width - 44,
            height: 92,
            maxColumns: 1,
            preferredRows: 1,
            columnWidth: 214,
            rowHeight: 76,
            columnGap: 0,
            rowGap: 12
        });

        distributeInZone(nodesByType.nvrs, {
            x: supportZone.x + 18,
            y: supportZone.y + 18,
            width: supportColumnWidth,
            height: supportTopHeight,
            maxColumns: 1,
            preferredRows: Math.max(1, state.nvr),
            columnWidth: 196,
            rowHeight: 86,
            columnGap: 0,
            rowGap: 16
        });

        distributeInZone(nodesByType.ups, {
            x: supportZone.x + 18,
            y: supportBottomY,
            width: supportColumnWidth,
            height: supportBottomHeight,
            maxColumns: 1,
            preferredRows: Math.max(1, state.ups),
            columnWidth: 184,
            rowHeight: 82,
            columnGap: 0,
            rowGap: 14
        });

        distributeInZone(nodesByType.workstations, {
            x: supportZone.x + 18 + supportColumnWidth + supportColumnGap,
            y: supportZone.y + 18,
            width: supportColumnWidth,
            height: supportTopHeight,
            maxColumns: 1,
            preferredRows: Math.max(1, state.workstation),
            columnWidth: 176,
            rowHeight: 82,
            columnGap: 0,
            rowGap: 14
        });

        distributeInZone(nodesByType.monitors, {
            x: supportZone.x + 18 + supportColumnWidth + supportColumnGap,
            y: supportBottomY,
            width: supportColumnWidth,
            height: supportBottomHeight,
            maxColumns: 1,
            preferredRows: Math.max(1, state.monitor),
            columnWidth: 166,
            rowHeight: 80,
            columnGap: 0,
            rowGap: 14
        });

        return {
            canvas: canvas,
            state: state,
            summary: summary,
            nodes: nodes,
            links: buildLinks(nodes, state),
            renderedAt: Date.now()
        };
    }

    function buildLinks(nodes, state) {
        const links = [];
        const nodesByType = groupNodesByType(nodes);
        const switches = nodesByType.poeSwitch || [];
        const nvrs = nodesByType.nvr || [];
        const routers = nodesByType.routerFirewall || [];
        const workstations = nodesByType.workstation || [];
        const monitors = nodesByType.monitor || [];
        const upsUnits = nodesByType.ups || [];
        const cameras = (nodesByType.ipCamera || []).concat(nodesByType.ptzCamera || []);

        cameras.forEach(function (camera, index) {
            if (!switches.length) {
                return;
            }

            const targetSwitch = switches.length > 1 ? switches[index % switches.length] : switches[0];
            links.push({
                id: `link-${camera.id}-${targetSwitch.id}`,
                kind: 'network',
                route: 'horizontal',
                fromId: camera.id,
                toId: targetSwitch.id
            });
        });

        nvrs.forEach(function (nvr, index) {
            if (!switches.length) {
                return;
            }

            const targetSwitch = switches.length > 1 ? switches[index % switches.length] : switches[0];
            links.push({
                id: `link-${nvr.id}-${targetSwitch.id}`,
                kind: 'network',
                route: 'horizontal-reverse',
                fromId: nvr.id,
                toId: targetSwitch.id
            });
        });

        routers.forEach(function (router) {
            if (!switches.length) {
                return;
            }

            links.push({
                id: `link-${router.id}-${switches[0].id}`,
                kind: 'network',
                route: 'vertical',
                fromId: router.id,
                toId: switches[0].id
            });
        });

        workstations.forEach(function (workstation, index) {
            const targetSwitch = switches.length ? switches[index % switches.length] : routers[0];

            if (!targetSwitch) {
                return;
            }

            links.push({
                id: `link-${workstation.id}-${targetSwitch.id}`,
                kind: 'network',
                route: 'horizontal-reverse',
                fromId: workstation.id,
                toId: targetSwitch.id
            });
        });

        monitors.forEach(function (monitor, index) {
            const targetWorkstation = workstations[index % Math.max(1, workstations.length)] || null;
            const targetNvr = nvrs[0] || null;
            const targetNode = targetWorkstation || targetNvr;

            if (!targetNode) {
                return;
            }

            links.push({
                id: `link-${monitor.id}-${targetNode.id}`,
                kind: 'network',
                route: 'horizontal-reverse',
                fromId: monitor.id,
                toId: targetNode.id
            });
        });

        upsUnits.forEach(function (ups) {
            switches.forEach(function (switchNode) {
                links.push({
                    id: `support-${ups.id}-${switchNode.id}`,
                    kind: 'support',
                    route: 'support',
                    fromId: ups.id,
                    toId: switchNode.id
                });
            });

            nvrs.forEach(function (nvr) {
                links.push({
                    id: `support-${ups.id}-${nvr.id}`,
                    kind: 'support',
                    route: 'support',
                    fromId: ups.id,
                    toId: nvr.id
                });
            });
        });

        void state;

        return links;
    }

    function groupNodesByType(nodes) {
        return nodes.reduce(function (collection, node) {
            if (!collection[node.type]) {
                collection[node.type] = [];
            }

            collection[node.type].push(node);
            return collection;
        }, {});
    }

    function getNodeMap(nodes) {
        return nodes.reduce(function (map, node) {
            map.set(node.id, node);
            return map;
        }, new Map());
    }

    function getAnchorPoint(node, position) {
        if (position === 'left') {
            return {
                x: node.x,
                y: node.y + (node.height / 2)
            };
        }

        if (position === 'right') {
            return {
                x: node.x + node.width,
                y: node.y + (node.height / 2)
            };
        }

        if (position === 'top') {
            return {
                x: node.x + (node.width / 2),
                y: node.y
            };
        }

        return {
            x: node.x + (node.width / 2),
            y: node.y + node.height
        };
    }

    function buildHorizontalPath(fromPoint, toPoint) {
        const midX = Math.round(fromPoint.x + ((toPoint.x - fromPoint.x) * 0.45));
        return `M ${fromPoint.x} ${fromPoint.y} L ${midX} ${fromPoint.y} L ${midX} ${toPoint.y} L ${toPoint.x} ${toPoint.y}`;
    }

    function buildVerticalPath(fromPoint, toPoint) {
        const midY = Math.round(fromPoint.y + ((toPoint.y - fromPoint.y) * 0.5));
        return `M ${fromPoint.x} ${fromPoint.y} L ${fromPoint.x} ${midY} L ${toPoint.x} ${midY} L ${toPoint.x} ${toPoint.y}`;
    }

    function getPathDefinition(link, nodeMap) {
        const fromNode = nodeMap.get(link.fromId);
        const toNode = nodeMap.get(link.toId);

        if (!fromNode || !toNode) {
            return '';
        }

        if (link.route === 'vertical') {
            return buildVerticalPath(
                getAnchorPoint(fromNode, 'bottom'),
                getAnchorPoint(toNode, 'top')
            );
        }

        if (link.route === 'support') {
            return buildVerticalPath(
                getAnchorPoint(fromNode, 'top'),
                getAnchorPoint(toNode, 'bottom')
            );
        }

        if (link.route === 'horizontal-reverse') {
            return buildHorizontalPath(
                getAnchorPoint(fromNode, 'left'),
                getAnchorPoint(toNode, 'right')
            );
        }

        return buildHorizontalPath(
            getAnchorPoint(fromNode, 'right'),
            getAnchorPoint(toNode, 'left')
        );
    }

    function buildBackgroundMarkup(summary, canvas) {
        const cameraZone = canvas.zones.camera;
        const coreZone = canvas.zones.core;
        const supportZone = canvas.zones.support;
        const frameWidth = canvas.width - 36;
        const frameHeight = canvas.height - 36;
        const topologyY = canvas.height - 34;

        return `
            <defs>
                <pattern id="diagramGridPattern" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(148,163,184,0.08)" stroke-width="1"></path>
                </pattern>
            </defs>
            <rect width="${canvas.width}" height="${canvas.height}" fill="#050B16"></rect>
            <rect width="${canvas.width}" height="${canvas.height}" fill="url(#diagramGridPattern)"></rect>
            <rect x="18" y="18" width="${frameWidth}" height="${frameHeight}" rx="28" fill="rgba(7,17,31,0.9)" stroke="rgba(148,163,184,0.14)" stroke-width="1.5"></rect>
            <rect x="${cameraZone.x}" y="${cameraZone.y}" width="${cameraZone.width}" height="${cameraZone.height}" rx="24" fill="rgba(45,212,255,0.05)" stroke="rgba(45,212,255,0.18)" stroke-width="1.4"></rect>
            <rect x="${coreZone.x}" y="${coreZone.y}" width="${coreZone.width}" height="${coreZone.height}" rx="24" fill="rgba(158,255,0,0.05)" stroke="rgba(158,255,0,0.18)" stroke-width="1.4"></rect>
            <rect x="${supportZone.x}" y="${supportZone.y}" width="${supportZone.width}" height="${supportZone.height}" rx="24" fill="rgba(196,181,253,0.05)" stroke="rgba(196,181,253,0.18)" stroke-width="1.4"></rect>
            <text x="52" y="58" fill="#E2E8F0" font-size="24" font-weight="700" font-family="'Plus Jakarta Sans', Arial, sans-serif">CCTV Network Diagram Builder</text>
            <text x="${cameraZone.x + 18}" y="${cameraZone.y + 28}" fill="rgba(226,232,240,0.84)" font-size="18" font-weight="700" font-family="'Plus Jakarta Sans', Arial, sans-serif">Camera Endpoints</text>
            <text x="${coreZone.x + 18}" y="${coreZone.y + 28}" fill="rgba(226,232,240,0.84)" font-size="18" font-weight="700" font-family="'Plus Jakarta Sans', Arial, sans-serif">Core Switching and Recording</text>
            <text x="${supportZone.x + 18}" y="${supportZone.y + 28}" fill="rgba(226,232,240,0.84)" font-size="18" font-weight="700" font-family="'Plus Jakarta Sans', Arial, sans-serif">Operations and Power Support</text>
            <text x="52" y="${topologyY}" fill="rgba(203,213,225,0.76)" font-size="15" font-weight="500" font-family="'Rubik', Arial, sans-serif">${escapeHtml(summary.suggestedTopology)}</text>
        `;
    }

    function buildNodeMarkup(node) {
        const config = DEVICE_CONFIG[node.type];
        const labelWidth = Math.max(76, node.width - 86);
        const labelFontSize = node.label.length > 18 ? 12.5 : 14;
        const labelFitAttributes = node.label.length > 12
            ? ` textLength="${labelWidth}" lengthAdjust="spacingAndGlyphs"`
            : '';
        return `
            <g class="diagram-node" data-node-id="${node.id}" transform="translate(${node.x} ${node.y})" tabindex="0" aria-label="${escapeHtml(node.label)}">
                <rect x="0" y="0" width="${node.width}" height="${node.height}" rx="16" fill="${config.fill}" fill-opacity="0.95" stroke="${config.accent}" stroke-opacity="0.55" stroke-width="1.4"></rect>
                <rect x="0" y="0" width="${node.width}" height="8" rx="16" fill="${config.accent}" fill-opacity="0.95"></rect>
                <rect x="14" y="${Math.round((node.height / 2) - 14)}" width="46" height="28" rx="14" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)" stroke-width="1"></rect>
                <text x="37" y="${Math.round((node.height / 2) + 4)}" text-anchor="middle" fill="#F8FAFC" font-size="11.5" font-weight="700" font-family="'Plus Jakarta Sans', Arial, sans-serif">${escapeHtml(config.icon)}</text>
                <text x="72" y="27" fill="#FFFFFF" font-size="${labelFontSize}" font-weight="700"${labelFitAttributes} font-family="'Plus Jakarta Sans', Arial, sans-serif">${escapeHtml(node.label)}</text>
                <text x="72" y="47" fill="rgba(226,232,240,0.82)" font-size="11.5" font-weight="500" font-family="'Rubik', Arial, sans-serif">${escapeHtml(config.shortLabel)}</text>
            </g>
        `;
    }

    function buildConnectionsMarkup(diagram) {
        const nodeMap = getNodeMap(diagram.nodes);

        return diagram.links.map(function (link) {
            const path = getPathDefinition(link, nodeMap);
            const stroke = link.kind === 'support' ? 'rgba(250, 204, 21, 0.88)' : 'rgba(45, 212, 255, 0.82)';
            const dash = link.kind === 'support' ? 'stroke-dasharray="10 8"' : '';

            return `<path class="diagram-link" data-link-id="${link.id}" d="${path}" fill="none" stroke="${stroke}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" ${dash}></path>`;
        }).join('');
    }

    function renderDiagram(diagram) {
        svg.setAttribute('viewBox', `0 0 ${diagram.canvas.width} ${diagram.canvas.height}`);
        svg.setAttribute('width', String(diagram.canvas.width));
        svg.setAttribute('height', String(diagram.canvas.height));
        svg.style.width = `${diagram.canvas.width}px`;
        svg.style.height = `${diagram.canvas.height}px`;

        svg.innerHTML = `
            ${buildBackgroundMarkup(diagram.summary, diagram.canvas)}
            <g id="diagramConnectionsLayer">${buildConnectionsMarkup(diagram)}</g>
            <g id="diagramNodesLayer">${diagram.nodes.map(buildNodeMarkup).join('')}</g>
        `;

        diagramDom.connectionsLayer = svg.querySelector('#diagramConnectionsLayer');
        diagramDom.nodesLayer = svg.querySelector('#diagramNodesLayer');
        diagramDom.nodeGroups = new Map();

        svg.querySelectorAll('.diagram-node').forEach(function (nodeGroup) {
            diagramDom.nodeGroups.set(nodeGroup.dataset.nodeId, nodeGroup);
            nodeGroup.addEventListener('pointerdown', onNodePointerDown);
        });
    }

    function refreshConnections() {
        if (!currentDiagram || !diagramDom.connectionsLayer) {
            return;
        }

        diagramDom.connectionsLayer.innerHTML = buildConnectionsMarkup(currentDiagram);
    }

    function showGeneratedState() {
        canvasEmptyState.classList.add('d-none');
        if (canvasShell) {
            canvasShell.classList.remove('is-empty');
        }
        summaryEmptyState.classList.add('d-none');
        summaryContent.classList.remove('d-none');
    }

    function clearGeneratedState() {
        canvasEmptyState.classList.remove('d-none');
        if (canvasShell) {
            canvasShell.classList.add('is-empty');
        }
        summaryEmptyState.classList.remove('d-none');
        summaryContent.classList.add('d-none');
        svg.innerHTML = '';
        svg.setAttribute('viewBox', `0 0 ${DEFAULT_CANVAS_WIDTH} ${DEFAULT_CANVAS_HEIGHT}`);
        svg.setAttribute('width', String(DEFAULT_CANVAS_WIDTH));
        svg.setAttribute('height', String(DEFAULT_CANVAS_HEIGHT));
        svg.style.width = '100%';
        svg.style.height = '100%';
        diagramDom.connectionsLayer = null;
        diagramDom.nodesLayer = null;
        diagramDom.nodeGroups = new Map();
        dragState = null;
        resetSummary();
        currentDiagram = null;
    }

    function updateLayoutControls() {
        layoutStatus.textContent = layoutLocked ? 'Layout locked' : 'Layout unlocked';
        lockLayoutButton.disabled = layoutLocked;
        unlockLayoutButton.disabled = !layoutLocked;
    }

    function updatePremiumUi() {
        premiumStateLocked.classList.toggle('d-none', premiumState !== 'locked');
        premiumStateUnlocked.classList.toggle('d-none', premiumState !== 'unlocked');
        premiumStateCancelled.classList.toggle('d-none', premiumState !== 'cancelled');

        unlockExportBundleButton.disabled = premiumUnlocked;
        unlockExportBundleButton.textContent = premiumUnlocked ? 'Export Bundle Unlocked' : 'Unlock Export Bundle';

        if (premiumUnlocked) {
            premiumExportStatus.textContent = 'Premium export bundle is unlocked for this session. PNG and PDF export are available for the current diagram.';
            return;
        }

        if (premiumState === 'cancelled') {
            premiumExportStatus.textContent = 'Checkout was not completed. Free planning remains available while premium export stays locked.';
            return;
        }

        if (PREMIUM_EXPORT_CONFIG.bundlePaymentLink) {
            premiumExportStatus.textContent = 'Premium export bundle is ready for a secure one-time Stripe checkout.';
            return;
        }

        premiumExportStatus.textContent = 'Premium export bundle is scaffolded and ready for Stripe Payment Link or Checkout integration.';
    }

    function scrollToBuilder() {
        const builderSection = document.getElementById('builder-interface');
        if (!builderSection) {
            return;
        }

        builderSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    function buildDiagramFromInputs() {
        const state = getBuilderState();

        if (!validateBuilderState(state)) {
            return;
        }

        const summary = calculateSummary(state);
        currentDiagram = buildAutoLayout(state, summary);
        updateSummary(summary);
        renderDiagram(currentDiagram);
        showGeneratedState();
        updateLayoutControls();
    }

    function autoLayoutCurrentDiagram() {
        const state = getBuilderState();

        if (!validateBuilderState(state)) {
            return;
        }

        const summary = calculateSummary(state);
        currentDiagram = buildAutoLayout(state, summary);
        updateSummary(summary);
        renderDiagram(currentDiagram);
        showGeneratedState();
    }

    function clearCanvas() {
        clearValidation();
        clearGeneratedState();
    }

    function resetBuilder() {
        quantityInputs.forEach(function (input) {
            input.value = '0';
        });

        clearValidation();
        clearGeneratedState();
    }

    function getSvgPoint(event) {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        return point.matrixTransform(svg.getScreenCTM().inverse());
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function getCurrentCanvasSize() {
        if (currentDiagram && currentDiagram.canvas) {
            return currentDiagram.canvas;
        }

        return {
            width: DEFAULT_CANVAS_WIDTH,
            height: DEFAULT_CANVAS_HEIGHT
        };
    }

    function getNodeById(nodeId) {
        if (!currentDiagram) {
            return null;
        }

        return currentDiagram.nodes.find(function (node) {
            return node.id === nodeId;
        }) || null;
    }

    function onNodePointerDown(event) {
        if (layoutLocked || !currentDiagram) {
            return;
        }

        const nodeId = event.currentTarget.dataset.nodeId;
        const node = getNodeById(nodeId);

        if (!node) {
            return;
        }

        const point = getSvgPoint(event);
        dragState = {
            nodeId: nodeId,
            pointerId: event.pointerId,
            offsetX: point.x - node.x,
            offsetY: point.y - node.y
        };

        event.currentTarget.classList.add('is-dragging');

        try {
            svg.setPointerCapture(event.pointerId);
        } catch (error) {
            // Pointer capture is not critical for the drag fallback.
        }

        event.preventDefault();
    }

    function onSvgPointerMove(event) {
        if (!dragState || !currentDiagram) {
            return;
        }

        const node = getNodeById(dragState.nodeId);
        const canvas = getCurrentCanvasSize();

        if (!node) {
            return;
        }

        const point = getSvgPoint(event);
        node.x = Math.round(clamp(point.x - dragState.offsetX, 18, canvas.width - node.width - 18));
        node.y = Math.round(clamp(point.y - dragState.offsetY, 18, canvas.height - node.height - 18));

        const nodeGroup = diagramDom.nodeGroups.get(node.id);
        if (nodeGroup) {
            nodeGroup.setAttribute('transform', `translate(${node.x} ${node.y})`);
        }

        refreshConnections();
    }

    function endNodeDrag() {
        if (!dragState) {
            return;
        }

        const nodeGroup = diagramDom.nodeGroups.get(dragState.nodeId);
        if (nodeGroup) {
            nodeGroup.classList.remove('is-dragging');
        }

        dragState = null;
    }

    function serializeSvgToImageDataUrl() {
        return new Promise(function (resolve, reject) {
            const canvasSize = getCurrentCanvasSize();
            const serializer = new XMLSerializer();
            const svgClone = svg.cloneNode(true);
            svgClone.setAttribute('xmlns', SVG_NS);
            svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            const markup = serializer.serializeToString(svgClone);
            const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            const image = new Image();

            image.onload = function () {
                const canvas = document.createElement('canvas');
                const scale = 2;
                const context = canvas.getContext('2d');

                canvas.width = canvasSize.width * scale;
                canvas.height = canvasSize.height * scale;
                context.fillStyle = '#050B16';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(blobUrl);
                resolve(canvas.toDataURL('image/png'));
            };

            image.onerror = function () {
                URL.revokeObjectURL(blobUrl);
                reject(new Error('Unable to render the diagram image.'));
            };

            image.src = blobUrl;
        });
    }

    function exportPng() {
        if (!currentDiagram) {
            premiumExportStatus.textContent = 'Build a diagram before exporting a PNG.';
            return;
        }

        serializeSvgToImageDataUrl().then(function (dataUrl) {
            const downloadLink = document.createElement('a');
            downloadLink.href = dataUrl;
            downloadLink.download = 'cctv-network-diagram.png';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
        }).catch(function () {
            premiumExportStatus.textContent = 'PNG export could not be completed from the current diagram.';
        });
    }

    function exportPdf() {
        if (!currentDiagram) {
            premiumExportStatus.textContent = 'Build a diagram before exporting a PDF.';
            return;
        }

        const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=800');

        if (!printWindow) {
            premiumExportStatus.textContent = 'Allow pop-ups to continue with PDF export.';
            return;
        }

        serializeSvgToImageDataUrl().then(function (dataUrl) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <title>CCTV Network Diagram PDF Export</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 24px;
                            background: #ffffff;
                            font-family: Arial, sans-serif;
                            text-align: center;
                        }
                        img {
                            max-width: 100%;
                            height: auto;
                        }
                    </style>
                </head>
                <body>
                    <img src="${dataUrl}" alt="CCTV Network Diagram">
                    <script>
                        window.onload = function () {
                            window.print();
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }).catch(function () {
            printWindow.close();
            premiumExportStatus.textContent = 'PDF export could not be prepared from the current diagram.';
        });
    }

    function openPremiumPrompt() {
        premiumModalBody.textContent = 'PNG and PDF export are premium features designed for planning convenience, project coordination, and client-facing review.';
        premiumModalSecondary.textContent = 'Continue with a one-time unlock to export your current diagram.';
        premiumModalStatus.textContent = 'Export is unlocked through a secure one-time Stripe checkout. After payment, you’ll return to the builder with premium export access.';
        premiumModalPlaceholderNote.classList.toggle('d-none', Boolean(PREMIUM_EXPORT_CONFIG.bundlePaymentLink));

        if (window.bootstrap && typeof window.bootstrap.Modal === 'function') {
            if (!premiumModal) {
                premiumModal = new window.bootstrap.Modal(premiumModalElement);
            }

            premiumModal.show();
        }
    }

    function handlePremiumAction(format) {
        if (premiumUnlocked) {
            if (format === 'png') {
                exportPng();
                return;
            }

            exportPdf();
            return;
        }

        openPremiumPrompt();
    }

    function handlePremiumCheckoutAttempt() {
        if (!PREMIUM_EXPORT_CONFIG.bundlePaymentLink) {
            premiumModalPlaceholderNote.classList.remove('d-none');
            premiumExportStatus.textContent = 'Stripe checkout has not been configured yet. Add a Payment Link or Checkout redirect to activate premium export.';
            return;
        }

        window.location.href = PREMIUM_EXPORT_CONFIG.bundlePaymentLink;
    }

    quantityInputs.forEach(function (input) {
        input.addEventListener('input', function () {
            input.value = String(sanitizeQuantity(input.value));
            clearValidation();
        });

        input.addEventListener('change', function () {
            input.value = String(sanitizeQuantity(input.value));
            clearValidation();
        });
    });

    document.querySelectorAll('.diagram-qty-button').forEach(function (button) {
        button.addEventListener('click', function () {
            const input = document.querySelector(`.diagram-qty-input[data-device-type="${button.dataset.deviceType}"]`);
            const currentValue = sanitizeQuantity(input.value);

            if (button.dataset.action === 'increment') {
                input.value = String(currentValue + 1);
            } else {
                input.value = String(Math.max(0, currentValue - 1));
            }

            clearValidation();
        });
    });

    buildButton.addEventListener('click', buildDiagramFromInputs);
    resetButton.addEventListener('click', resetBuilder);
    autoLayoutButton.addEventListener('click', autoLayoutCurrentDiagram);
    clearCanvasButton.addEventListener('click', clearCanvas);
    lockLayoutButton.addEventListener('click', function () {
        layoutLocked = true;
        updateLayoutControls();
    });
    unlockLayoutButton.addEventListener('click', function () {
        layoutLocked = false;
        updateLayoutControls();
    });

    unlockExportBundleButton.addEventListener('click', function () {
        openPremiumPrompt();
    });

    premiumPngActionButton.addEventListener('click', function () {
        handlePremiumAction('png');
    });

    premiumPdfActionButton.addEventListener('click', function () {
        handlePremiumAction('pdf');
    });

    premiumUnlockedExportPngButton.addEventListener('click', function () {
        handlePremiumAction('png');
    });

    premiumUnlockedExportPdfButton.addEventListener('click', function () {
        handlePremiumAction('pdf');
    });

    premiumReturnToBuilderButton.addEventListener('click', scrollToBuilder);
    premiumReturnToBuilderFromCancelButton.addEventListener('click', scrollToBuilder);

    premiumRetryCheckoutButton.addEventListener('click', function () {
        openPremiumPrompt();
    });

    premiumContinueCheckoutButton.addEventListener('click', handlePremiumCheckoutAttempt);

    svg.addEventListener('pointermove', onSvgPointerMove);
    svg.addEventListener('pointerup', endNodeDrag);
    svg.addEventListener('pointercancel', endNodeDrag);
    svg.addEventListener('pointerleave', endNodeDrag);

    resetSummary();
    updateLayoutControls();
    updatePremiumUi();
    clearGeneratedState();

    // Keep this helper available for future verified Stripe integration work.
    window.NetworkConnectITCctvBuilder = {
        setPremiumUnlocked: setPremiumUnlockState,
        setPremiumState: setPremiumState
    };
})();
