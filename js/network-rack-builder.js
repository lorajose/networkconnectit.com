// Network Rack Builder Tool
(function () {
    const form = document.getElementById('rackBuilderForm');
    if (!form) return;

    const validationMessage = document.getElementById('rackBuilderValidation');
    const resetButton = document.getElementById('rackBuilderResetButton');
    const emptyState = document.getElementById('rackResultsEmpty');
    const resultsContent = document.getElementById('rackResultsContent');

    const fields = {
        rackType: document.getElementById('rackType'),
        expansionAllowance: document.getElementById('expansionAllowance'),
        needBlankingPanels: document.getElementById('needBlankingPanels'),
        numberOfSwitches: document.getElementById('numberOfSwitches'),
        numberOfPatchPanels: document.getElementById('numberOfPatchPanels'),
        numberOfNVRs: document.getElementById('numberOfNVRs'),
        numberOfUPSUnits: document.getElementById('numberOfUPSUnits'),
        numberOfShelves: document.getElementById('numberOfShelves'),
        numberOfCableManagers: document.getElementById('numberOfCableManagers'),
        addPDUUnits: document.getElementById('addPDUUnits'),
        numberOfSmallDevices: document.getElementById('numberOfSmallDevices')
    };

    const output = {
        recommendedRackSize: document.getElementById('resultRecommendedRackSize'),
        rackUnitsUsed: document.getElementById('resultRackUnitsUsed'),
        spareCapacity: document.getElementById('resultSpareCapacity'),
        powerRequirement: document.getElementById('resultPowerRequirement'),
        heatLoad: document.getElementById('resultHeatLoad'),
        cableManagementRecommendation: document.getElementById('resultCableManagementRecommendation'),
        rackOrganizationNote: document.getElementById('resultRackOrganizationNote'),
        planningSummary: document.getElementById('resultRackPlanningSummary')
    };

    const expansionFactorBySelection = {
        '10%': 1.10,
        '20%': 1.20,
        '30%': 1.30
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
        output.recommendedRackSize.textContent = '-';
        output.rackUnitsUsed.textContent = '-';
        output.spareCapacity.textContent = '-';
        output.powerRequirement.textContent = '-';
        output.heatLoad.textContent = '-';
        output.cableManagementRecommendation.textContent = '-';
        output.rackOrganizationNote.textContent = '-';
        output.planningSummary.textContent = '-';
    }

    function getQuantity(field) {
        const value = String(field.value).trim();
        if (value === '') {
            return 0;
        }

        return Number(value);
    }

    function getRecommendedRackSize(plannedU) {
        if (plannedU <= 6) return 9;
        if (plannedU <= 12) return 12;
        if (plannedU <= 18) return 18;
        if (plannedU <= 24) return 24;
        if (plannedU <= 42) return 42;
        return 48;
    }

    function getCableManagementRecommendation(numberOfPatchPanels, numberOfCableManagers) {
        if (numberOfCableManagers === 0) {
            return 'Add dedicated cable managers for cleaner routing, labeling, and serviceability.';
        }

        if (numberOfPatchPanels >= 2 && numberOfCableManagers < 2) {
            return 'Consider adding more cable managers to support patching density and cleaner front-of-rack organization.';
        }

        return 'Cable management allocation appears generally suitable for organized rack routing, subject to final layout.';
    }

    function getRackOrganizationNote(rackType, recommendedRackNumeric, heatBTU, numberOfUPSUnits, numberOfNVRs) {
        if (rackType === 'Wall Mount Rack' && recommendedRackNumeric >= 24) {
            return 'A larger rack plan may be better suited to a floor rack or enclosed cabinet depending on wall space, weight, and service access.';
        }

        if (rackType === 'Enclosed Cabinet' && heatBTU > 3000) {
            return 'Estimated heat load suggests reviewing airflow, ventilation, and service clearance inside the cabinet.';
        }

        if (numberOfUPSUnits >= 2) {
            return 'Multiple UPS units increase weight and lower-rack planning importance. Review placement for stability and serviceability.';
        }

        if (numberOfNVRs >= 2) {
            return 'Multiple recording devices may benefit from structured shelf/rack placement, airflow spacing, and clean rear cable routing.';
        }

        return 'Rack layout appears generally suitable for organized deployment planning, subject to final field review.';
    }

    // Keep validation explicit so the form fails with one clear inline message.
    function validateInputs() {
        const requiredSelections = [
            fields.rackType,
            fields.expansionAllowance,
            fields.needBlankingPanels,
            fields.addPDUUnits
        ];

        const missingSelections = requiredSelections.some(function (field) {
            return String(field.value).trim() === '';
        });

        if (missingSelections) {
            setValidation('Please select the rack settings and enter at least one equipment quantity to build a rack plan.');
            return false;
        }

        const quantities = [
            getQuantity(fields.numberOfSwitches),
            getQuantity(fields.numberOfPatchPanels),
            getQuantity(fields.numberOfNVRs),
            getQuantity(fields.numberOfUPSUnits),
            getQuantity(fields.numberOfShelves),
            getQuantity(fields.numberOfCableManagers),
            getQuantity(fields.numberOfSmallDevices)
        ];

        const hasInvalidQuantity = quantities.some(function (value) {
            return Number.isNaN(value) || value < 0;
        });

        if (hasInvalidQuantity) {
            setValidation('Equipment quantities cannot be negative.');
            return false;
        }

        const hasEquipment = quantities.some(function (value) {
            return value > 0;
        });

        if (!hasEquipment) {
            setValidation('Please select the rack settings and enter at least one equipment quantity to build a rack plan.');
            return false;
        }

        clearValidation();
        return true;
    }

    // Apply the user-facing planning rules directly so the results stay transparent.
    function calculateRackPlan() {
        const rackType = fields.rackType.value;
        const expansionAllowance = fields.expansionAllowance.value;
        const needBlankingPanels = fields.needBlankingPanels.value;
        const numberOfSwitches = getQuantity(fields.numberOfSwitches);
        const numberOfPatchPanels = getQuantity(fields.numberOfPatchPanels);
        const numberOfNVRs = getQuantity(fields.numberOfNVRs);
        const numberOfUPSUnits = getQuantity(fields.numberOfUPSUnits);
        const numberOfShelves = getQuantity(fields.numberOfShelves);
        const numberOfCableManagers = getQuantity(fields.numberOfCableManagers);
        const addPDUUnits = fields.addPDUUnits.value;
        const numberOfSmallDevices = getQuantity(fields.numberOfSmallDevices);

        const pduUnits = addPDUUnits === 'Yes' ? 1 : 0;
        const usedU = (
            (numberOfSwitches * 1) +
            (numberOfPatchPanels * 1) +
            (numberOfNVRs * 2) +
            (numberOfUPSUnits * 2) +
            (numberOfShelves * 1) +
            (numberOfCableManagers * 1) +
            (pduUnits * 1)
        );
        const blankingU = needBlankingPanels === 'Yes' ? Math.max(1, Math.round(usedU * 0.10)) : 0;
        const usedUWithBlanking = usedU + blankingU;
        const plannedU = Math.ceil(usedUWithBlanking * expansionFactorBySelection[expansionAllowance]);
        const recommendedRackNumeric = getRecommendedRackSize(plannedU);
        const recommendedRackText = `${recommendedRackNumeric}U Rack`;
        const spareU = recommendedRackNumeric - usedUWithBlanking;
        const spareCapacityText = spareU >= 0 ? `${spareU}U available for growth` : 'Capacity exceeded \u2014 larger rack planning recommended';
        const powerW = (
            (numberOfSwitches * 180) +
            (numberOfPatchPanels * 0) +
            (numberOfNVRs * 90) +
            (numberOfUPSUnits * 30) +
            (numberOfShelves * 0) +
            (numberOfCableManagers * 0) +
            (numberOfSmallDevices * 20) +
            (pduUnits * 10)
        );
        const heatBTU = Math.round(powerW * 3.41);
        const powerText = `${powerW} W estimated`;
        const heatText = `${heatBTU} BTU/hr estimated`;
        const spareSummary = spareU >= 0 ? `approximately ${spareU}U available for growth` : 'capacity already exceeded under current assumptions';

        output.recommendedRackSize.textContent = recommendedRackText;
        output.rackUnitsUsed.textContent = `${usedUWithBlanking}U allocated`;
        output.spareCapacity.textContent = spareCapacityText;
        output.powerRequirement.textContent = powerText;
        output.heatLoad.textContent = heatText;
        output.cableManagementRecommendation.textContent = getCableManagementRecommendation(numberOfPatchPanels, numberOfCableManagers);
        output.rackOrganizationNote.textContent = getRackOrganizationNote(rackType, recommendedRackNumeric, heatBTU, numberOfUPSUnits, numberOfNVRs);
        output.planningSummary.textContent = `This rack plan suggests a ${recommendedRackText.toLowerCase()} with approximately ${usedUWithBlanking}U allocated before future growth allowance. The current equipment mix is estimated at ${powerText.toLowerCase()} and ${heatText.toLowerCase()}, with ${spareSummary}. Review final device dimensions, airflow, mounting depth, and service access before installation.`;

        showResults();
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!validateInputs()) {
            return;
        }

        calculateRackPlan();
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
