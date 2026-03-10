// CCTV Coverage Calculator
(function () {
    const form = document.getElementById('coverageCalculatorForm');
    if (!form) return;

    const validationMessage = document.getElementById('coverageValidation');
    const resetButton = document.getElementById('coverageResetButton');
    const emptyState = document.getElementById('coverageResultsEmpty');
    const resultsContent = document.getElementById('coverageResultsContent');

    const fields = {
        siteType: document.getElementById('siteType'),
        coveragePriority: document.getElementById('coveragePriority'),
        cameraType: document.getElementById('cameraType'),
        fieldOfView: document.getElementById('fieldOfView'),
        areaWidth: document.getElementById('areaWidth'),
        areaLength: document.getElementById('areaLength'),
        unit: document.getElementById('unit'),
        mountingHeight: document.getElementById('mountingHeight')
    };

    const output = {
        cameraCount: document.getElementById('resultCameraCount'),
        spacing: document.getElementById('resultSpacing'),
        overlap: document.getElementById('resultOverlap'),
        mountingNote: document.getElementById('resultMountingNote'),
        cameraTypeNote: document.getElementById('resultCameraTypeNote'),
        blindSpotRisk: document.getElementById('resultBlindSpotRisk'),
        planningSummary: document.getElementById('resultPlanningSummary')
    };

    const METERS_TO_FEET = 3.28084;

    const baseCoverageByView = {
        Narrow: 600,
        Medium: 900,
        Wide: 1300
    };

    const priorityMultiplier = {
        Overview: 1.15,
        Detection: 1.0,
        Recognition: 0.7
    };

    const cameraTypeFactor = {
        'Fixed Dome': 1.0,
        Bullet: 1.05,
        Turret: 1.0,
        PTZ: 1.2
    };

    const overlapGuidance = {
        Overview: {
            display: 'Approx. 10% overlap recommended',
            summary: '10% overlap'
        },
        Detection: {
            display: 'Approx. 15% overlap recommended',
            summary: '15% overlap'
        },
        Recognition: {
            display: 'Approx. 20% overlap recommended',
            summary: '20% overlap'
        }
    };

    const cameraTypeNotes = {
        'Fixed Dome': 'Fixed dome cameras are commonly used for clean indoor coverage and general-purpose fixed viewing angles.',
        Bullet: 'Bullet cameras are often effective for directional coverage and longer viewing corridors.',
        Turret: 'Turret cameras can provide flexible fixed coverage and are often used in mixed indoor/outdoor commercial environments.',
        PTZ: 'PTZ cameras can increase flexibility, but fixed coverage planning is still important for consistent scene visibility.'
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
        output.cameraCount.textContent = '-';
        output.spacing.textContent = '-';
        output.overlap.textContent = '-';
        output.mountingNote.textContent = '-';
        output.cameraTypeNote.textContent = '-';
        output.blindSpotRisk.textContent = '-';
        output.planningSummary.textContent = '-';
    }

    function toFeet(value, unit) {
        return unit === 'Meters' ? value * METERS_TO_FEET : value;
    }

    function getMountingNote(heightFeet) {
        if (heightFeet < 8) {
            return 'Lower mounting height may improve detail but can reduce overall area coverage.';
        }

        if (heightFeet <= 14) {
            return 'Mounting height is within a practical planning range for general commercial coverage.';
        }

        return 'Higher mounting height may increase overall view but can reduce subject detail depending on the scene.';
    }

    function getBlindSpotRisk(cameraCount, areaFeet, fieldOfView, coveragePriority, siteType) {
        if (cameraCount <= 2 && areaFeet > 3000) {
            return 'High';
        }

        if (fieldOfView === 'Narrow' && coveragePriority === 'Recognition') {
            return 'Medium';
        }

        if (siteType === 'Hallway') {
            return 'Low';
        }

        return 'Moderate';
    }

    function getSpacingText(finalCoveragePerCamera, unit) {
        const spacingFeetRounded = Math.round(Math.sqrt(finalCoveragePerCamera));

        if (unit === 'Meters') {
            const spacingMeters = spacingFeetRounded / METERS_TO_FEET;
            return `${spacingMeters.toFixed(1)} m apart`;
        }

        return `${spacingFeetRounded} ft apart`;
    }

    function validateInputs() {
        const missingRequired = Object.values(fields).some((field) => String(field.value).trim() === '');
        if (missingRequired) {
            setValidation('Please complete all required fields to calculate coverage.');
            return false;
        }

        const width = Number(fields.areaWidth.value);
        const length = Number(fields.areaLength.value);
        const height = Number(fields.mountingHeight.value);

        if (width <= 0 || length <= 0 || height <= 0 || Number.isNaN(width) || Number.isNaN(length) || Number.isNaN(height)) {
            setValidation('Width, length, and mounting height must be positive numbers.');
            return false;
        }

        clearValidation();
        return true;
    }

    function calculateCoverage() {
        const siteType = fields.siteType.value;
        const coveragePriority = fields.coveragePriority.value;
        const cameraType = fields.cameraType.value;
        const fieldOfView = fields.fieldOfView.value;
        const unit = fields.unit.value;

        const widthFeet = toFeet(Number(fields.areaWidth.value), unit);
        const lengthFeet = toFeet(Number(fields.areaLength.value), unit);
        const mountingHeightFeet = toFeet(Number(fields.mountingHeight.value), unit);
        const areaFeet = widthFeet * lengthFeet;

        const baseCoverage = baseCoverageByView[fieldOfView];
        const adjustedCoverage = baseCoverage * priorityMultiplier[coveragePriority];
        const typeAdjustedCoverage = adjustedCoverage * cameraTypeFactor[cameraType];

        let heightFactor = 1.0;
        if (mountingHeightFeet < 8) {
            heightFactor = 0.85;
        } else if (mountingHeightFeet > 14) {
            heightFactor = 0.90;
        }

        const finalCoveragePerCamera = typeAdjustedCoverage * heightFactor;
        const cameraCount = Math.max(1, Math.ceil(areaFeet / finalCoveragePerCamera));
        const spacingText = getSpacingText(finalCoveragePerCamera, unit);
        const overlap = overlapGuidance[coveragePriority];
        const blindSpotRisk = getBlindSpotRisk(cameraCount, areaFeet, fieldOfView, coveragePriority, siteType);

        output.cameraCount.textContent = String(cameraCount);
        output.spacing.textContent = spacingText;
        output.overlap.textContent = overlap.display;
        output.mountingNote.textContent = getMountingNote(mountingHeightFeet);
        output.cameraTypeNote.textContent = cameraTypeNotes[cameraType];
        output.blindSpotRisk.textContent = blindSpotRisk;
        output.planningSummary.textContent = `For this ${siteType} layout, the calculator recommends approximately ${cameraCount} camera(s) with spacing around ${spacingText}. Based on the selected ${coveragePriority.toLowerCase()} priority and ${fieldOfView.toLowerCase()} field of view, a ${overlap.summary.toLowerCase()} is recommended. Review blind spots and real site conditions before final deployment.`;

        showResults();
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!validateInputs()) {
            return;
        }

        calculateCoverage();
    });

    resetButton.addEventListener('click', function () {
        form.reset();
        fields.unit.value = 'Feet';
        clearValidation();
        resetResults();
    });

    Object.values(fields).forEach(function (field) {
        field.addEventListener('input', clearValidation);
        field.addEventListener('change', clearValidation);
    });

    resetResults();
})();
