// AI Camera Placement Advisor
(function () {
    const form = document.getElementById('cameraAdvisorForm');
    if (!form) return;

    const validationMessage = document.getElementById('cameraAdvisorValidation');
    const resetButton = document.getElementById('cameraAdvisorResetButton');
    const emptyState = document.getElementById('cameraAdvisorEmpty');
    const resultsContent = document.getElementById('cameraAdvisorResults');

    const fields = {
        environmentType: document.getElementById('environmentType'),
        surveillanceObjective: document.getElementById('surveillanceObjective'),
        lightingCondition: document.getElementById('lightingCondition'),
        environmentSetting: document.getElementById('environmentSetting'),
        mountHeight: document.getElementById('mountHeight'),
        heightUnit: document.getElementById('heightUnit'),
        highRiskZones: document.getElementById('highRiskZones'),
        facialRecognitionPriority: document.getElementById('facialRecognitionPriority'),
        licensePlateCoverage: document.getElementById('licensePlateCoverage')
    };

    const output = {
        coveragePriorities: document.getElementById('resultCoveragePriorities'),
        priorityZones: document.getElementById('resultPriorityZones'),
        cameraTypeGuidance: document.getElementById('resultCameraTypeGuidance'),
        blindSpotNotes: document.getElementById('resultBlindSpotNotes'),
        environmentalRecommendations: document.getElementById('resultEnvironmentalRecommendations'),
        planningSummary: document.getElementById('resultPlanningSummary')
    };

    const METERS_TO_FEET = 3.28084;

    const coveragePriorityByObjective = {
        Overview: 'Prioritize broad scene visibility, major circulation paths, and overall situational awareness.',
        Recognition: 'Prioritize tighter subject framing, controlled angles, and positions that support facial or identity-level detail.',
        'Entry Monitoring': 'Prioritize entry and exit points, controlled access paths, and direct approach angles.',
        'Asset Protection': 'Prioritize high-value storage areas, restricted zones, equipment areas, and vulnerable asset locations.',
        'People Flow': 'Prioritize pathways, queue points, circulation bottlenecks, and activity concentration zones.',
        'Perimeter Visibility': 'Prioritize boundary lines, approach paths, loading edges, exterior transitions, and limited-visibility zones.'
    };

    const priorityThemeByObjective = {
        Overview: 'broad scene visibility and major circulation paths',
        Recognition: 'tighter subject framing and controlled approach angles',
        'Entry Monitoring': 'entry and exit points with direct approach angles',
        'Asset Protection': 'high-value storage areas and vulnerable asset locations',
        'People Flow': 'pathways, circulation bottlenecks, and activity concentration zones',
        'Perimeter Visibility': 'boundary lines and limited-visibility exterior approaches'
    };

    const baseZonesByEnvironment = {
        Warehouse: 'loading areas, storage aisles, dock doors, equipment zones',
        Office: 'main entrances, reception, corridors, shared access points',
        'Retail Store': 'entries, point-of-sale zones, merchandise hotspots, aisle intersections',
        Lobby: 'main entry, reception desk, waiting areas, elevator approaches',
        'Parking Lot': 'vehicle entry/exit lanes, payment or access points, pedestrian paths, perimeter edges',
        School: 'main entrances, hall intersections, administrative access points, exterior approach routes',
        Hallway: 'entry thresholds, corridor intersections, end-of-hall blind areas',
        'Loading Dock': 'dock doors, approach lanes, staging zones, trailer interface points'
    };

    const blindSpotNotesByEnvironment = {
        Warehouse: 'Watch for aisle-end blind areas, tall storage obstructions, and dock transition shadows.',
        Office: 'Watch for reception-to-corridor transitions, doorway offsets, and glass glare near entrances.',
        'Retail Store': 'Watch for merchandising obstructions, aisle turns, and checkout-side angle gaps.',
        Lobby: 'Watch for elevator corners, seating clusters, and decorative architectural obstructions.',
        'Parking Lot': 'Watch for vehicle shadows, row-end visibility gaps, and weak coverage at perimeter edges.',
        School: 'Watch for corridor intersections, door recesses, and exterior-to-interior transitions.',
        Hallway: 'Watch for end-of-hall visibility gaps and doorway recesses.',
        'Loading Dock': 'Watch for trailer obstruction zones, dock equipment shadowing, and approach-angle blind spots.'
    };

    function setValidation(message) {
        validationMessage.textContent = message;
        validationMessage.classList.remove('d-none');
    }

    function clearValidation() {
        validationMessage.textContent = '';
        validationMessage.classList.add('d-none');
    }

    function showResults() {
        emptyState.classList.add('d-none');
        resultsContent.classList.remove('d-none');
    }

    function resetResults() {
        emptyState.classList.remove('d-none');
        resultsContent.classList.add('d-none');
        output.coveragePriorities.textContent = '-';
        output.priorityZones.textContent = '-';
        output.cameraTypeGuidance.textContent = '-';
        output.blindSpotNotes.textContent = '-';
        output.environmentalRecommendations.textContent = '-';
        output.planningSummary.textContent = '-';
    }

    function toFeet(value, unit) {
        return unit === 'Meters' ? value * METERS_TO_FEET : value;
    }

    function getSuggestedZones(environmentType, environmentSetting, highRiskZones, licensePlateCoverage) {
        let zones = baseZonesByEnvironment[environmentType];

        if (highRiskZones === 'Yes') {
            zones += ', high-risk restricted areas';
        }

        if (licensePlateCoverage === 'Yes' && (environmentSetting === 'Outdoor' || environmentType === 'Parking Lot' || environmentType === 'Loading Dock')) {
            zones += ', vehicle approach capture points';
        }

        return `Suggested priority zones include ${zones}.`;
    }

    function getCameraTypeGuidance(environmentType, surveillanceObjective, facialRecognitionPriority, licensePlateCoverage) {
        if (licensePlateCoverage === 'Yes') {
            return 'Use dedicated directional coverage for vehicle approach points and plate capture zones. Standard overview placement alone may not be sufficient.';
        }

        if (facialRecognitionPriority === 'Yes') {
            return 'Prioritize tighter directional camera placement at controlled approach angles rather than relying only on wide overview coverage.';
        }

        if (environmentType === 'Parking Lot' || environmentType === 'Loading Dock') {
            return 'Directional outdoor-rated cameras combined with wider overview coverage are typically helpful for exterior commercial visibility.';
        }

        if (surveillanceObjective === 'Overview') {
            return 'Wide or medium field-of-view fixed coverage is generally appropriate for broad scene awareness.';
        }

        return 'Use a balanced combination of fixed overview coverage and tighter directional views where detail matters most.';
    }

    function getBlindSpotNotes(environmentType, mountHeightFeet, lightingCondition) {
        let blindSpotNotes = blindSpotNotesByEnvironment[environmentType];

        if (mountHeightFeet > 14) {
            blindSpotNotes += ' Higher mounting positions may reduce subject detail if angle control is weak.';
        }

        if (lightingCondition === 'Low Light') {
            blindSpotNotes += ' Low-light conditions may increase scene interpretation difficulty and require stronger placement discipline.';
        }

        return blindSpotNotes;
    }

    function getEnvironmentalRecommendations(lightingCondition, mountHeightFeet, environmentSetting) {
        const lightingNoteByCondition = {
            Good: 'Lighting conditions appear generally favorable for standard placement planning.',
            Mixed: 'Mixed lighting suggests reviewing backlight, glare, and transition zones carefully.',
            'Low Light': 'Low-light conditions suggest stronger attention to illumination consistency, contrast, and camera positioning.'
        };

        let mountNote = 'Mount height appears within a practical commercial planning range for general coverage.';
        if (mountHeightFeet < 8) {
            mountNote = 'Lower mounting positions may improve detail but may also increase tamper exposure.';
        } else if (mountHeightFeet > 14) {
            mountNote = 'Higher mounting positions may broaden visibility but can reduce useful recognition detail.';
        }

        const settingNote = environmentSetting === 'Indoor'
            ? 'Indoor placement should still account for glare, ceiling layout, access points, and corridor transitions.'
            : 'Outdoor placement should account for weather exposure, lighting variation, approach angles, and perimeter edges.';

        return `${lightingNoteByCondition[lightingCondition]} ${mountNote} ${settingNote}`;
    }

    // Keep validation explicit so the advisor returns one clear inline message.
    function validateInputs() {
        const missingRequired = Object.values(fields).some(function (field) {
            return String(field.value).trim() === '';
        });

        const mountHeight = Number(fields.mountHeight.value);

        if (missingRequired || Number.isNaN(mountHeight) || mountHeight <= 0) {
            setValidation('Please complete all required inputs to generate placement recommendations.');
            return false;
        }

        clearValidation();
        return true;
    }

    // Apply the user-facing planning rules directly so the recommendations stay transparent.
    function calculateRecommendations() {
        const environmentType = fields.environmentType.value;
        const surveillanceObjective = fields.surveillanceObjective.value;
        const lightingCondition = fields.lightingCondition.value;
        const environmentSetting = fields.environmentSetting.value;
        const mountHeightFeet = toFeet(Number(fields.mountHeight.value), fields.heightUnit.value);
        const highRiskZones = fields.highRiskZones.value;
        const facialRecognitionPriority = fields.facialRecognitionPriority.value;
        const licensePlateCoverage = fields.licensePlateCoverage.value;

        const coveragePriorities = coveragePriorityByObjective[surveillanceObjective];
        const suggestedZones = getSuggestedZones(environmentType, environmentSetting, highRiskZones, licensePlateCoverage);
        const cameraTypeGuidance = getCameraTypeGuidance(environmentType, surveillanceObjective, facialRecognitionPriority, licensePlateCoverage);
        const blindSpotNotes = getBlindSpotNotes(environmentType, mountHeightFeet, lightingCondition);
        const environmentalRecommendations = getEnvironmentalRecommendations(lightingCondition, mountHeightFeet, environmentSetting);
        const priorityTheme = priorityThemeByObjective[surveillanceObjective];
        const zoneTheme = suggestedZones.replace(/^Suggested priority zones include\s*/i, '').replace(/\.$/, '');

        output.coveragePriorities.textContent = coveragePriorities;
        output.priorityZones.textContent = suggestedZones;
        output.cameraTypeGuidance.textContent = cameraTypeGuidance;
        output.blindSpotNotes.textContent = blindSpotNotes;
        output.environmentalRecommendations.textContent = environmentalRecommendations;
        output.planningSummary.textContent = `For this ${environmentType.toLowerCase()} environment focused on ${surveillanceObjective.toLowerCase()}, the advisor recommends prioritizing ${priorityTheme}. Placement should begin with ${zoneTheme}. Review lighting, height, and blind spot conditions carefully before final deployment.`;

        showResults();
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!validateInputs()) {
            return;
        }

        calculateRecommendations();
    });

    resetButton.addEventListener('click', function () {
        form.reset();
        fields.heightUnit.value = 'Feet';
        clearValidation();
        resetResults();
    });

    Object.values(fields).forEach(function (field) {
        field.addEventListener('input', clearValidation);
        field.addEventListener('change', clearValidation);
    });

    resetResults();
})();
