// Multi-Site Deployment Planner
(function () {
    const form = document.getElementById('multiSitePlannerForm');
    if (!form) return;

    const validationMessage = document.getElementById('multiSitePlannerValidation');
    const resetButton = document.getElementById('multiSitePlannerResetButton');
    const emptyState = document.getElementById('multiSitePlannerEmpty');
    const resultsContent = document.getElementById('multiSitePlannerResults');

    const fields = {
        siteCount: document.getElementById('siteCount'),
        countriesInvolved: document.getElementById('countriesInvolved'),
        statesInvolved: document.getElementById('statesInvolved'),
        citiesInvolved: document.getElementById('citiesInvolved'),
        projectType: document.getElementById('projectType'),
        equipmentLevel: document.getElementById('equipmentLevel'),
        averageCameras: document.getElementById('averageCameras'),
        averageDoors: document.getElementById('averageDoors'),
        deploymentPriority: document.getElementById('deploymentPriority'),
        standardizationLevel: document.getElementById('standardizationLevel'),
        logisticsComplexity: document.getElementById('logisticsComplexity')
    };

    const output = {
        rolloutComplexity: document.getElementById('resultRolloutComplexity'),
        deploymentApproach: document.getElementById('resultDeploymentApproach'),
        crewScaling: document.getElementById('resultCrewScaling'),
        rolloutDuration: document.getElementById('resultRolloutDuration'),
        coordinationRisk: document.getElementById('resultCoordinationRisk'),
        logisticsNote: document.getElementById('resultLogisticsNote'),
        planningSummary: document.getElementById('resultPlanningSummary')
    };

    const equipmentFactorByLevel = {
        Light: 1,
        Medium: 2,
        Heavy: 3
    };

    const siteScalePoints = {
        Small: 1,
        Medium: 2,
        Large: 3,
        Enterprise: 4
    };

    const standardizationScore = {
        High: 0,
        Medium: 1,
        Low: 2
    };

    const logisticsScore = {
        Low: 0,
        Medium: 1,
        High: 2
    };

    const priorityScore = {
        'Fast Rollout': 2,
        Balanced: 1,
        'Phased Deployment': 0
    };

    const durationByScale = {
        Small: '1\u20133 weeks',
        Medium: '3\u20138 weeks',
        Large: '2\u20134 months',
        Enterprise: '4+ months'
    };

    function setValidation() {
        validationMessage.textContent = 'Please complete the required deployment inputs to generate a rollout plan.';
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
        output.rolloutComplexity.textContent = '-';
        output.deploymentApproach.textContent = '-';
        output.crewScaling.textContent = '-';
        output.rolloutDuration.textContent = '-';
        output.coordinationRisk.textContent = '-';
        output.logisticsNote.textContent = '-';
        output.planningSummary.textContent = '-';
    }

    function getNumericValue(field) {
        const value = String(field.value).trim();
        if (value === '') {
            return 0;
        }

        return Number(value);
    }

    function countCommaSeparatedEntries(value) {
        return String(value)
            .split(',')
            .map(function (item) {
                return item.trim();
            })
            .filter(Boolean).length;
    }

    function getSiteScale(siteCount) {
        if (siteCount <= 5) {
            return 'Small';
        }

        if (siteCount <= 20) {
            return 'Medium';
        }

        if (siteCount <= 75) {
            return 'Large';
        }

        return 'Enterprise';
    }

    function getEquipmentFactor(equipmentLevel, averageCameras, averageDoors) {
        let factor = equipmentFactorByLevel[equipmentLevel];

        if (averageCameras >= 20) {
            factor += 1;
        }

        if (averageDoors >= 8) {
            factor += 1;
        }

        return factor;
    }

    function getRolloutComplexity(complexityScore) {
        if (complexityScore <= 4) {
            return 'Low';
        }

        if (complexityScore <= 7) {
            return 'Moderate';
        }

        if (complexityScore <= 10) {
            return 'High';
        }

        return 'Enterprise';
    }

    function getDeploymentApproach(rolloutComplexity) {
        const approachByComplexity = {
            Low: 'Single regional crew with sequential site scheduling may be sufficient.',
            Moderate: 'Phased regional scheduling with limited parallel crews is recommended.',
            High: 'Parallel regional execution with stronger project coordination is recommended.',
            Enterprise: 'Dedicated program-style rollout planning with regional crew coordination and centralized oversight is recommended.'
        };

        return approachByComplexity[rolloutComplexity];
    }

    function getCrewScaling(siteScale, deploymentPriority) {
        const crewScalingBySiteScale = {
            Small: '1 deployment crew may be sufficient depending on schedule expectations.',
            Medium: '2 coordinated crews may be appropriate for a balanced rollout.',
            Large: '3 to 4 coordinated crews may be needed depending on overlap and timeline.',
            Enterprise: '4+ coordinated crews with centralized scheduling may be required.'
        };

        let crewScaling = crewScalingBySiteScale[siteScale];

        if (deploymentPriority === 'Fast Rollout') {
            crewScaling += ' Fast rollout goals may require additional parallel capacity.';
        }

        return crewScaling;
    }

    function getAdjustedDurationScale(siteScale, logisticsComplexity, standardizationLevel, countryCount) {
        const needsAdjustment = logisticsComplexity === 'High' || standardizationLevel === 'Low' || countryCount >= 2;

        if (!needsAdjustment) {
            return siteScale;
        }

        if (siteScale === 'Small') {
            return 'Medium';
        }

        if (siteScale === 'Medium') {
            return 'Large';
        }

        if (siteScale === 'Large') {
            return 'Enterprise';
        }

        return 'Enterprise';
    }

    function getCoordinationRisk(countryCount, stateCount, logisticsComplexity) {
        if (countryCount >= 2) {
            return 'High';
        }

        if (stateCount >= 3 || logisticsComplexity === 'High') {
            return 'Moderate';
        }

        return 'Low';
    }

    function getLogisticsNote(logisticsComplexity, standardizationLevel, deploymentPriority) {
        if (logisticsComplexity === 'High') {
            return 'Travel, dispatch coordination, site access timing, and material staging should be planned carefully across regions.';
        }

        if (standardizationLevel === 'Low') {
            return 'Lower site standardization may create additional variation in labor planning, material prep, and deployment sequencing.';
        }

        if (deploymentPriority === 'Fast Rollout') {
            return 'Fast rollout objectives may require tighter coordination between procurement, scheduling, and field execution.';
        }

        return 'Logistics conditions appear generally manageable for structured rollout planning, subject to final project review.';
    }

    function getRegionSummary(countryCount, stateCount, cityCount) {
        if (countryCount >= 2) {
            return 'multiple countries';
        }

        if (stateCount >= 2) {
            return 'multiple states/provinces';
        }

        if (cityCount >= 2) {
            return 'multiple cities';
        }

        return 'a limited regional footprint';
    }

    function toSummaryLower(text) {
        return text.replace(/\.$/, '').toLowerCase();
    }

    // Keep validation explicit so rollout assumptions fail with one clear inline message.
    function validateInputs() {
        const requiredSelections = [
            fields.projectType,
            fields.equipmentLevel,
            fields.deploymentPriority,
            fields.standardizationLevel,
            fields.logisticsComplexity
        ];

        const missingRequired = requiredSelections.some(function (field) {
            return String(field.value).trim() === '';
        });

        const siteCount = Number(fields.siteCount.value);
        const averageCameras = getNumericValue(fields.averageCameras);
        const averageDoors = getNumericValue(fields.averageDoors);

        if (missingRequired || Number.isNaN(siteCount) || siteCount <= 0) {
            setValidation();
            return false;
        }

        if (Number.isNaN(averageCameras) || Number.isNaN(averageDoors) || averageCameras < 0 || averageDoors < 0) {
            setValidation();
            return false;
        }

        if (fields.projectType.value === 'Mixed Security Rollout' && averageCameras === 0 && averageDoors === 0) {
            setValidation();
            return false;
        }

        clearValidation();
        return true;
    }

    // Apply the visible planning rules directly so the rollout output stays transparent.
    function calculatePlan() {
        const siteCount = Number(fields.siteCount.value);
        const countryCount = countCommaSeparatedEntries(fields.countriesInvolved.value);
        const stateCount = countCommaSeparatedEntries(fields.statesInvolved.value);
        const cityCount = countCommaSeparatedEntries(fields.citiesInvolved.value);
        const projectType = fields.projectType.value;
        const equipmentLevel = fields.equipmentLevel.value;
        const averageCameras = getNumericValue(fields.averageCameras);
        const averageDoors = getNumericValue(fields.averageDoors);
        const deploymentPriority = fields.deploymentPriority.value;
        const standardizationLevel = fields.standardizationLevel.value;
        const logisticsComplexity = fields.logisticsComplexity.value;

        const siteScale = getSiteScale(siteCount);
        const equipmentFactor = getEquipmentFactor(equipmentLevel, averageCameras, averageDoors);

        let complexityScore = 0;
        complexityScore += siteScalePoints[siteScale];
        complexityScore += equipmentFactor;

        if (countryCount >= 2) {
            complexityScore += 2;
        } else if (stateCount >= 3) {
            complexityScore += 1;
        }

        complexityScore += standardizationScore[standardizationLevel];
        complexityScore += logisticsScore[logisticsComplexity];
        complexityScore += priorityScore[deploymentPriority];

        const rolloutComplexity = getRolloutComplexity(complexityScore);
        const deploymentApproach = getDeploymentApproach(rolloutComplexity);
        const crewScaling = getCrewScaling(siteScale, deploymentPriority);
        const adjustedDurationScale = getAdjustedDurationScale(siteScale, logisticsComplexity, standardizationLevel, countryCount);
        const rolloutDuration = durationByScale[adjustedDurationScale];
        const coordinationRisk = getCoordinationRisk(countryCount, stateCount, logisticsComplexity);
        const logisticsNote = getLogisticsNote(logisticsComplexity, standardizationLevel, deploymentPriority);
        const regionSummary = getRegionSummary(countryCount, stateCount, cityCount);

        output.rolloutComplexity.textContent = rolloutComplexity;
        output.deploymentApproach.textContent = deploymentApproach;
        output.crewScaling.textContent = crewScaling;
        output.rolloutDuration.textContent = rolloutDuration;
        output.coordinationRisk.textContent = coordinationRisk;
        output.logisticsNote.textContent = logisticsNote;
        output.planningSummary.textContent = `For this ${projectType.toLowerCase()} covering approximately ${siteCount} site(s) across ${regionSummary}, the rollout is estimated as ${rolloutComplexity.toLowerCase()} complexity. A ${rolloutDuration.toLowerCase()} deployment window may be appropriate, with ${toSummaryLower(crewScaling)}. Review site variation, logistics, material staging, and scheduling dependencies before execution.`;

        showResults();
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!validateInputs()) {
            return;
        }

        calculatePlan();
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
