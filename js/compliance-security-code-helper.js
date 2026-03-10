// Compliance & Security Code Helper
(function () {
    const form = document.getElementById('complianceHelperForm');
    if (!form) return;

    const validationMessage = document.getElementById('complianceHelperValidation');
    const resetButton = document.getElementById('complianceHelperResetButton');
    const emptyState = document.getElementById('complianceHelperEmpty');
    const resultsContent = document.getElementById('complianceHelperResults');

    const fields = {
        projectLocation: document.getElementById('projectLocation'),
        buildingType: document.getElementById('buildingType'),
        occupancyType: document.getElementById('occupancyType'),
        systemType: document.getElementById('systemType'),
        environmentSetting: document.getElementById('environmentSetting'),
        fireLifeSafetyInteraction: document.getElementById('fireLifeSafetyInteraction'),
        adaSensitiveEntries: document.getElementById('adaSensitiveEntries')
    };

    const output = {
        complianceTopics: document.getElementById('resultComplianceTopics'),
        ahjNote: document.getElementById('resultAhjNote'),
        adaReminder: document.getElementById('resultAdaReminder'),
        electricalNote: document.getElementById('resultElectricalNote'),
        documentationRecommendations: document.getElementById('resultDocumentationRecommendations'),
        planningSummary: document.getElementById('resultPlanningSummary')
    };

    const baseComplianceTopicsBySystemType = {
        CCTV: 'Verify mounting locations, visibility assumptions, pathway routing, device protection, and any location-specific surveillance policies.',
        'Access Control': 'Verify door hardware coordination, egress behavior, credentialed access flow, lock release behavior, and public-entry conditions.',
        Intrusion: 'Verify device coverage assumptions, panel location planning, signaling pathway considerations, and after-hours access or arming workflow needs.',
        'Low Voltage': 'Verify pathway planning, cable support expectations, equipment mounting, separation from power systems, and final field routing conditions.',
        'Mixed Security Systems': 'Verify coordination across surveillance, access control, intrusion, low-voltage pathways, and how systems interact at shared locations.'
    };

    const buildingComplianceAdditions = {
        Office: 'Review shared access points, reception areas, corridors, and tenant-facing coordination.',
        Retail: 'Review point-of-sale zones, public entry conditions, customer circulation paths, and visible device placement concerns.',
        Warehouse: 'Review dock areas, storage aisles, equipment zones, restricted access paths, and high-clearance mounting conditions.',
        'Healthcare Facility': 'Review patient-sensitive areas, restricted workflows, equipment visibility, and location-specific access or privacy concerns.',
        School: 'Review public-facing access points, corridor supervision, administrative entries, and site-specific safety expectations.',
        'Residential Building': 'Review common areas, controlled entries, resident pathways, visitor access points, and shared property conditions.',
        'Mixed Commercial Space': 'Review tenant variation, shared corridors, common access points, and cross-use coordination needs.',
        'Outdoor / Campus': 'Review weather exposure, perimeter transitions, pathway protection, and equipment protection at exterior locations.'
    };

    const occupancyAdditions = {
        'General Business': 'Review everyday staff access patterns, routine operations, and business-hour coordination needs.',
        'Public-Facing': 'Review public interaction points, user flow, visible device placement expectations, and entry usability.',
        'Restricted Access': 'Review controlled zones, authorization boundaries, and restricted circulation paths.',
        'High-Traffic': 'Review congestion points, queue behavior, and peak movement conditions at key access locations.',
        'Mixed Occupancy': 'Review mixed user flows, shared boundaries, and coordination across different occupancy expectations.'
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
        output.complianceTopics.textContent = '-';
        output.ahjNote.textContent = '-';
        output.adaReminder.textContent = '-';
        output.electricalNote.textContent = '-';
        output.documentationRecommendations.textContent = '-';
        output.planningSummary.textContent = '-';
    }

    function getComplianceTopics(systemType, buildingType, occupancyType, fireLifeSafetyInteraction) {
        let complianceTopics = `${baseComplianceTopicsBySystemType[systemType]} ${buildingComplianceAdditions[buildingType]} ${occupancyAdditions[occupancyType]}`;

        if (fireLifeSafetyInteraction === 'Yes') {
            complianceTopics += ' Review how the project may interact with egress, emergency conditions, or life-safety behavior before installation.';
        }

        return complianceTopics;
    }

    function getAhjNote(fireLifeSafetyInteraction, buildingType, systemType) {
        if (fireLifeSafetyInteraction === 'Yes') {
            return 'Because life-safety or egress behavior may be affected, early review with the AHJ, design team, or other authorized stakeholders may be important before field execution.';
        }

        if (buildingType === 'Healthcare Facility' || buildingType === 'School') {
            return 'Projects in more sensitive occupancies may require stronger review coordination with facility stakeholders, consultants, or local authorities before execution.';
        }

        if (systemType === 'Access Control') {
            return 'Access control work often benefits from early coordination around entry conditions, release behavior, and approval expectations before installation.';
        }

        return 'Local review requirements can vary by jurisdiction and project scope. Confirm review expectations early to avoid avoidable installation delays.';
    }

    function getAdaReminder(adaSensitiveEntries, systemType) {
        if (adaSensitiveEntries === 'Yes') {
            return 'Accessible entry conditions should be reviewed carefully. Confirm that hardware placement, user interaction, access flow, and clear-path expectations align with project requirements and applicable standards.';
        }

        if (systemType === 'Access Control') {
            return 'Even where ADA-sensitive entries are not explicitly flagged, review entry usability, approach conditions, and public-facing access points where relevant.';
        }

        return 'Accessibility considerations may still apply depending on the site and user path. Review access routes and user interaction points as part of planning.';
    }

    function getElectricalNote(systemType, environmentSetting) {
        const electricalNoteBySystemType = {
            'Low Voltage': 'Coordinate pathway planning, support methods, power separation, mounting conditions, and final termination locations before installation.',
            CCTV: 'Coordinate camera power method, pathway routing, head-end locations, network switching, and final mounting support conditions before installation.',
            'Access Control': 'Coordinate lock power, controller locations, door hardware interfaces, cable pathways, and release behavior before installation.',
            Intrusion: 'Coordinate panel placement, powering method, device wiring paths, and protected equipment mounting conditions before installation.',
            'Mixed Security Systems': 'Coordinate shared pathways, power planning, control locations, equipment interfaces, and field sequencing across all systems before installation.'
        };

        let electricalNote = electricalNoteBySystemType[systemType];

        if (environmentSetting === 'Outdoor') {
            electricalNote += ' Outdoor conditions may require additional review of enclosure protection, environmental exposure, and pathway durability.';
        } else if (environmentSetting === 'Mixed') {
            electricalNote += ' Mixed indoor/outdoor scope may require separate coordination assumptions for interior and exterior device locations.';
        }

        return electricalNote;
    }

    function hasJurisdictionWording(projectLocation) {
        const normalizedLocation = projectLocation.toLowerCase();

        return normalizedLocation.includes('state') ||
            normalizedLocation.includes('province') ||
            normalizedLocation.includes('country') ||
            normalizedLocation.includes(',') ||
            normalizedLocation.includes('/');
    }

    function getDocumentationRecommendations(projectLocation, systemType) {
        let documentationRecommendations = 'Prepare clear site-specific documentation including equipment locations, pathway assumptions, device schedules, access points, and scope notes.';

        if (systemType === 'Access Control') {
            documentationRecommendations += ' Include door-by-door hardware and behavior notes where applicable.';
        }

        if (systemType === 'CCTV') {
            documentationRecommendations += ' Include camera location intent, coverage expectations, and mounting assumptions where possible.';
        }

        if (systemType === 'Mixed Security Systems') {
            documentationRecommendations += ' Include cross-system coordination notes so field teams understand sequencing and shared dependencies.';
        }

        if (hasJurisdictionWording(projectLocation)) {
            documentationRecommendations += ' Confirm jurisdiction-specific review and documentation expectations before execution.';
        }

        return documentationRecommendations;
    }

    // Keep validation explicit so the helper fails with one clear inline message.
    function validateInputs() {
        const missingRequired = Object.values(fields).some(function (field) {
            return String(field.value).trim() === '';
        });

        if (missingRequired) {
            setValidation('Please complete all required inputs to generate planning guidance.');
            return false;
        }

        clearValidation();
        return true;
    }

    // Apply the visible planning rules directly so the guidance stays careful and transparent.
    function calculateGuidance() {
        const projectLocation = fields.projectLocation.value.trim();
        const buildingType = fields.buildingType.value;
        const occupancyType = fields.occupancyType.value;
        const systemType = fields.systemType.value;
        const environmentSetting = fields.environmentSetting.value;
        const fireLifeSafetyInteraction = fields.fireLifeSafetyInteraction.value;
        const adaSensitiveEntries = fields.adaSensitiveEntries.value;

        output.complianceTopics.textContent = getComplianceTopics(systemType, buildingType, occupancyType, fireLifeSafetyInteraction);
        output.ahjNote.textContent = getAhjNote(fireLifeSafetyInteraction, buildingType, systemType);
        output.adaReminder.textContent = getAdaReminder(adaSensitiveEntries, systemType);
        output.electricalNote.textContent = getElectricalNote(systemType, environmentSetting);
        output.documentationRecommendations.textContent = getDocumentationRecommendations(projectLocation, systemType);
        output.planningSummary.textContent = `For this ${systemType.toLowerCase()} project in a ${buildingType.toLowerCase()} environment, the helper highlights coordination topics related to compliance review, accessibility, electrical planning, and documentation. Review stakeholder expectations, field conditions, and any jurisdiction-specific requirements before final execution.`;

        showResults();
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!validateInputs()) {
            return;
        }

        calculateGuidance();
    });

    resetButton.addEventListener('click', function () {
        form.reset();
        clearValidation();
        resetResults();
    });

    Object.values(fields).forEach(function (field) {
        field.addEventListener('input', clearValidation);
        field.addEventListener('change', clearValidation);
    });

    resetResults();
})();
