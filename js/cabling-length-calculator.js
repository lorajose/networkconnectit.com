// Cabling Length Calculator
(function () {
    const form = document.getElementById('cablingCalculatorForm');
    if (!form) return;

    const validationMessage = document.getElementById('cablingValidation');
    const resetButton = document.getElementById('cablingResetButton');
    const emptyState = document.getElementById('cablingResultsEmpty');
    const resultsContent = document.getElementById('cablingResultsContent');

    const fields = {
        projectType: document.getElementById('projectType'),
        buildingType: document.getElementById('buildingType'),
        floorsInvolved: document.getElementById('floorsInvolved'),
        numberOfDevices: document.getElementById('numberOfDevices'),
        averageDistance: document.getElementById('averageDistance'),
        distanceUnit: document.getElementById('distanceUnit'),
        routingComplexity: document.getElementById('routingComplexity'),
        serviceLoop: document.getElementById('serviceLoop'),
        sparePercentage: document.getElementById('sparePercentage')
    };

    const output = {
        baseCableLength: document.getElementById('resultBaseCableLength'),
        routingAdjustment: document.getElementById('resultRoutingAdjustment'),
        serviceLoopAllowance: document.getElementById('resultServiceLoopAllowance'),
        spareAllowance: document.getElementById('resultSpareAllowance'),
        totalCableLength: document.getElementById('resultTotalCableLength'),
        fiberThresholdNote: document.getElementById('resultFiberThresholdNote'),
        installationComplexityNote: document.getElementById('resultInstallationComplexityNote'),
        planningSummary: document.getElementById('resultPlanningSummary')
    };

    const METERS_TO_FEET = 3.28084;

    const floorFactorByCount = {
        1: 1.0,
        2: 1.08,
        3: 1.15
    };

    const routingFactorByComplexity = {
        Low: 1.0,
        Medium: 1.12,
        High: 1.25
    };

    const spareFactorBySelection = {
        '5%': 0.05,
        '10%': 0.10,
        '15%': 0.15
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
        output.baseCableLength.textContent = '-';
        output.routingAdjustment.textContent = '-';
        output.serviceLoopAllowance.textContent = '-';
        output.spareAllowance.textContent = '-';
        output.totalCableLength.textContent = '-';
        output.fiberThresholdNote.textContent = '-';
        output.installationComplexityNote.textContent = '-';
        output.planningSummary.textContent = '-';
    }

    function toFeet(value, unit) {
        return unit === 'Meters' ? value * METERS_TO_FEET : value;
    }

    function formatLength(lengthFeet, unit) {
        if (unit === 'Meters') {
            return `${(lengthFeet / METERS_TO_FEET).toFixed(1)} m`;
        }

        return `${Math.round(lengthFeet)} ft`;
    }

    function getFloorFactor(floors) {
        if (floors >= 4) {
            return 1.25;
        }

        return floorFactorByCount[floors] || 1.0;
    }

    function getFiberThresholdNote(projectType, averageDistanceFeet) {
        if (projectType === 'Network Infrastructure' && averageDistanceFeet > 295) {
            return 'Average run length may justify fiber consideration depending on bandwidth, topology, and endpoint requirements.';
        }

        if (averageDistanceFeet > 295) {
            return 'Some runs may exceed common copper planning thresholds. Review whether fiber or intermediate distribution points are needed.';
        }

        return 'Run length appears generally suitable for standard copper planning assumptions, subject to final field validation.';
    }

    function getInstallationComplexityNote(projectType, buildingType, routingComplexity, floors) {
        if (routingComplexity === 'High' && floors >= 3) {
            return 'High routing complexity across multiple floors suggests a more coordination-heavy installation plan.';
        }

        if (buildingType === 'Outdoor / Campus') {
            return 'Outdoor or campus-style environments may require additional pathway, protection, and distance planning.';
        }

        if (projectType === 'Access Control') {
            return 'Access control cabling often requires closer coordination around door hardware, power, and control panel routing.';
        }

        if (projectType === 'CCTV') {
            return 'CCTV deployments benefit from verifying camera placement, head-end location, and pathway efficiency before pull day.';
        }

        return 'Project conditions appear suitable for standard structured cabling planning, subject to final site review.';
    }

    function validateInputs() {
        const missingRequired = Object.values(fields).some((field) => String(field.value).trim() === '');
        if (missingRequired) {
            setValidation('Please complete all required fields to calculate cable length.');
            return false;
        }

        const floors = Number(fields.floorsInvolved.value);
        const devices = Number(fields.numberOfDevices.value);
        const averageDistance = Number(fields.averageDistance.value);

        if (floors <= 0 || devices <= 0 || averageDistance <= 0 || Number.isNaN(floors) || Number.isNaN(devices) || Number.isNaN(averageDistance)) {
            setValidation('Floors, number of devices, and average distance must be positive numbers.');
            return false;
        }

        clearValidation();
        return true;
    }

    function calculateCableLength() {
        const projectType = fields.projectType.value;
        const buildingType = fields.buildingType.value;
        const floors = Number(fields.floorsInvolved.value);
        const numberOfDevices = Number(fields.numberOfDevices.value);
        const averageDistanceInput = Number(fields.averageDistance.value);
        const unit = fields.distanceUnit.value;
        const routingComplexity = fields.routingComplexity.value;
        const serviceLoopSelection = fields.serviceLoop.value;
        const sparePercentage = fields.sparePercentage.value;

        const averageDistanceFeet = toFeet(averageDistanceInput, unit);
        const baseCable = numberOfDevices * averageDistanceFeet;
        const baseWithFloor = baseCable * getFloorFactor(floors);
        const adjustedCable = baseWithFloor * routingFactorByComplexity[routingComplexity];
        const routingAdjustmentAmount = adjustedCable - baseWithFloor;
        const serviceLoopAmount = serviceLoopSelection === 'Yes' ? adjustedCable * 0.08 : 0;
        const afterServiceLoop = adjustedCable + serviceLoopAmount;
        const spareAmount = afterServiceLoop * spareFactorBySelection[sparePercentage];
        const totalCable = afterServiceLoop + spareAmount;
        const serviceLoopSummary = serviceLoopSelection === 'Yes' ? 'service loop allowance' : 'no service loop allowance';

        output.baseCableLength.textContent = formatLength(baseWithFloor, unit);
        output.routingAdjustment.textContent = formatLength(routingAdjustmentAmount, unit);
        output.serviceLoopAllowance.textContent = formatLength(serviceLoopAmount, unit);
        output.spareAllowance.textContent = formatLength(spareAmount, unit);
        output.totalCableLength.textContent = formatLength(totalCable, unit);
        output.fiberThresholdNote.textContent = getFiberThresholdNote(projectType, averageDistanceFeet);
        output.installationComplexityNote.textContent = getInstallationComplexityNote(projectType, buildingType, routingComplexity, floors);
        output.planningSummary.textContent = `For this ${projectType.toLowerCase()} project, the calculator estimates a total planned cable requirement of approximately ${formatLength(totalCable, unit)}. This includes routing adjustments, ${serviceLoopSummary}, and a ${sparePercentage} spare allowance. Review actual pathways, device locations, risers, and termination points before final installation.`;

        showResults();
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!validateInputs()) {
            return;
        }

        calculateCableLength();
    });

    resetButton.addEventListener('click', function () {
        form.reset();
        fields.distanceUnit.value = 'Feet';
        clearValidation();
        resetResults();
    });

    Object.values(fields).forEach(function (field) {
        field.addEventListener('input', clearValidation);
        field.addEventListener('change', clearValidation);
    });

    resetResults();
})();
