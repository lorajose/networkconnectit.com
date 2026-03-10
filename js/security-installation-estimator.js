// Security Installation Cost Estimator
(function () {
    const form = document.getElementById('securityEstimatorForm');
    if (!form) return;

    const validationMessage = document.getElementById('securityEstimatorValidation');
    const resetButton = document.getElementById('securityEstimatorResetButton');
    const emptyState = document.getElementById('securityEstimatorEmpty');
    const resultsContent = document.getElementById('securityEstimatorResults');

    const fields = {
        projectType: document.getElementById('projectType'),
        buildingType: document.getElementById('buildingType'),
        deviceCount: document.getElementById('deviceCount'),
        floorCount: document.getElementById('floorCount'),
        cableDistance: document.getElementById('cableDistance'),
        distanceUnit: document.getElementById('distanceUnit'),
        routingComplexity: document.getElementById('routingComplexity'),
        ceilingType: document.getElementById('ceilingType'),
        accessDifficulty: document.getElementById('accessDifficulty')
    };

    const output = {
        projectSize: document.getElementById('resultProjectSize'),
        installationDuration: document.getElementById('resultInstallationDuration'),
        crewSize: document.getElementById('resultCrewSize'),
        cableComplexity: document.getElementById('resultCableComplexity'),
        riskLevel: document.getElementById('resultRiskLevel'),
        planningSummary: document.getElementById('resultPlanningSummary')
    };

    const METERS_TO_FEET = 3.28084;

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
        output.projectSize.textContent = '-';
        output.installationDuration.textContent = '-';
        output.crewSize.textContent = '-';
        output.cableComplexity.textContent = '-';
        output.riskLevel.textContent = '-';
        output.planningSummary.textContent = '-';
    }

    function toFeet(value, unit) {
        return unit === 'Meters' ? value * METERS_TO_FEET : value;
    }

    function getProjectSize(deviceCount) {
        if (deviceCount <= 10) {
            return 'Small';
        }

        if (deviceCount <= 40) {
            return 'Medium';
        }

        if (deviceCount <= 100) {
            return 'Large';
        }

        return 'Enterprise';
    }

    function getInstallationDays(projectSize, floorCount, routingComplexity, ceilingType, accessDifficulty) {
        const baseDaysBySize = {
            Small: 1,
            Medium: 2,
            Large: 4,
            Enterprise: 7
        };

        let totalDays = baseDaysBySize[projectSize];

        if (floorCount >= 3) {
            totalDays += 1;
        }

        if (routingComplexity === 'High') {
            totalDays += 1;
        }

        if (ceilingType === 'Concrete') {
            totalDays += 1;
        }

        if (accessDifficulty === 'Difficult') {
            totalDays += 1;
        }

        return totalDays;
    }

    function getCrewSize(projectSize) {
        const crewBySize = {
            Small: 1,
            Medium: 2,
            Large: 3,
            Enterprise: 4
        };

        const crewCount = crewBySize[projectSize];
        return `${crewCount} ${crewCount === 1 ? 'technician' : 'technicians'}`;
    }

    function getCableComplexity(routingComplexity) {
        const complexityByRouting = {
            Low: 'Low',
            Medium: 'Moderate',
            High: 'High'
        };

        return complexityByRouting[routingComplexity];
    }

    function getRiskLevel(floorCount, routingComplexity, accessDifficulty) {
        if (accessDifficulty === 'Difficult' && routingComplexity === 'High') {
            return 'High';
        }

        if (floorCount >= 3) {
            return 'Moderate';
        }

        return 'Low';
    }

    function formatDuration(days) {
        return `${days} ${days === 1 ? 'day' : 'days'} estimated`;
    }

    // Keep validation explicit so the user gets one clear inline message.
    function validateInputs() {
        const missingRequired = Object.values(fields).some(function (field) {
            return String(field.value).trim() === '';
        });

        if (missingRequired) {
            setValidation('Please complete the project inputs and enter at least one device to estimate the project.');
            return false;
        }

        const deviceCount = Number(fields.deviceCount.value);
        const floorCount = Number(fields.floorCount.value);
        const cableDistance = Number(fields.cableDistance.value);

        if (Number.isNaN(deviceCount) || Number.isNaN(floorCount) || Number.isNaN(cableDistance) || deviceCount <= 0 || floorCount <= 0 || cableDistance <= 0) {
            setValidation('Device count, floor count, and cable distance must be positive numbers.');
            return false;
        }

        clearValidation();
        return true;
    }

    // Apply the stated planning rules directly so the estimator stays transparent.
    function calculateEstimate() {
        const projectType = fields.projectType.value;
        const deviceCount = Number(fields.deviceCount.value);
        const floorCount = Number(fields.floorCount.value);
        const cableDistanceFeet = toFeet(Number(fields.cableDistance.value), fields.distanceUnit.value);
        const routingComplexity = fields.routingComplexity.value;
        const ceilingType = fields.ceilingType.value;
        const accessDifficulty = fields.accessDifficulty.value;
        const projectSize = getProjectSize(deviceCount);
        const installationDays = getInstallationDays(projectSize, floorCount, routingComplexity, ceilingType, accessDifficulty);
        const crewSize = getCrewSize(projectSize);
        const cableComplexity = getCableComplexity(routingComplexity);
        const riskLevel = getRiskLevel(floorCount, routingComplexity, accessDifficulty);
        const floorLabel = `${floorCount} ${floorCount === 1 ? 'floor' : 'floors'}`;

        // Normalize the distance input now so future planning rules stay unit-consistent.
        void cableDistanceFeet;

        output.projectSize.textContent = projectSize;
        output.installationDuration.textContent = formatDuration(installationDays);
        output.crewSize.textContent = crewSize;
        output.cableComplexity.textContent = cableComplexity;
        output.riskLevel.textContent = riskLevel;
        output.planningSummary.textContent = `For this ${projectType} project with approximately ${deviceCount} devices across ${floorLabel}, the deployment is estimated as a ${projectSize.toLowerCase()} project. Installation may require approximately ${installationDays} ${installationDays === 1 ? 'day' : 'days'} with a recommended crew of ${crewSize}. Routing conditions and building characteristics suggest ${riskLevel.toLowerCase()} deployment risk.`;

        showResults();
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!validateInputs()) {
            return;
        }

        calculateEstimate();
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
