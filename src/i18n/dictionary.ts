/**
 * VayuShield Bilingual Dictionary
 * Module: dictionary.ts
 *
 * Full typed parity between English ('en') and Hindi ('hi').
 * Provides accessible, culturally grounded environmental health copy,
 * clinical instructions, and society advisories.
 */

import type {
  CombustionEventType,
  CommuteMode,
  CpcbCategory,
  GrapStageId,
  HouseholdArchetype,
  UsEpaCategory,
} from "@/engine";

export type SupportedLanguage = "en" | "hi";

export interface CityPreset {
  id: string;
  nameEn: string;
  nameHi: string;
  lat: number;
  lon: number;
  descriptionEn: string;
  descriptionHi: string;
}

export const CITY_PRESETS: CityPreset[] = [
  {
    id: "delhi_tikri",
    nameEn: "New Delhi (Tikri Kalan)",
    nameHi: "नई दिल्ली (टीकरी कलां)",
    lat: 28.69,
    lon: 76.97,
    descriptionEn: "Industrial border corridor with high particulate loading",
    descriptionHi: "उच्च धूल कणों वाला औद्योगिक सीमावर्ती क्षेत्र",
  },
  {
    id: "delhi_anand_vihar",
    nameEn: "Delhi (Anand Vihar)",
    nameHi: "दिल्ली (आनंद विहार)",
    lat: 28.65,
    lon: 77.31,
    descriptionEn: "High-density interstate transit and particulate hotspot",
    descriptionHi: "अंतरराज्यीय बस अड्डा व उच्च प्रदूषण हॉटस्पॉट",
  },
  {
    id: "delhi_connaught_place",
    nameEn: "Delhi (Connaught Place)",
    nameHi: "दिल्ली (कनॉट प्लेस)",
    lat: 28.63,
    lon: 77.22,
    descriptionEn: "Central commercial district and urban core",
    descriptionHi: "केंद्रीय वाणिज्यिक क्षेत्र और शहरी केंद्र",
  },
  {
    id: "mumbai_bkc",
    nameEn: "Mumbai (BKC)",
    nameHi: "मुंबई (बीकेसी)",
    lat: 19.06,
    lon: 72.87,
    descriptionEn: "Coastal urban center with high relative humidity deliquescence",
    descriptionHi: "तटीय वाणिज्यिक केंद्र, उच्च आर्द्रता प्रभाव",
  },
  {
    id: "bengaluru_whitefield",
    nameEn: "Bengaluru (Whitefield)",
    nameHi: "बेंगलुरु (व्हाइटफील्ड)",
    lat: 12.97,
    lon: 77.75,
    descriptionEn: "High-tech corridor with vehicular crustal dust",
    descriptionHi: "तकनीकी गलियारा, मध्यम सड़क धूल",
  },
  {
    id: "hyderabad_hitec",
    nameEn: "Hyderabad (HITEC City)",
    nameHi: "हैदराबाद (हाईटेक सिटी)",
    lat: 17.44,
    lon: 78.38,
    descriptionEn: "Deccan plateau urban zone",
    descriptionHi: "दक्कन पठार शहरी क्षेत्र",
  },
  {
    id: "pune_shivajinagar",
    nameEn: "Pune (Shivajinagar)",
    nameHi: "पुणे (शिवाजीनगर)",
    lat: 18.53,
    lon: 73.85,
    descriptionEn: "Valley topography with localized nocturnal trapping",
    descriptionHi: "घाटी स्थलाकृति, रात में प्रदूषण जमाव",
  },
];

export interface TranslationDictionary {
  app: {
    title: string;
    subtitle: string;
    skipToMain: string;
    liveIndicator: string;
    offlineIndicator: string;
    refreshButton: string;
    refreshing: string;
    citySelectorLabel: string;
    languageToggle: string;
    quickPresets: string;
    syncNoticePrefix: string;
    syncFallbackSuffix: string;
    briefingHeading: string;
    briefingDeterministicBadge: string;
    briefingGeminiBadge: string;
    briefingArchetypeNote: string;
    opensInNewTab: string;
    actionLabels: Record<string, string>;
  };
  dualScale: {
    eyebrow: string;
    title: string;
    description: string;
    humidityLabel: string;
    rhAdjustedLabel: string;
    rhAdjustedTitle: string;
    cpcbHeader: string;
    cpcbCategoryPrefix: string;
    epaHeader: string;
    epaCategoryPrefix: string;
    pm25InputLabel: string;
    dominantPollutantLabel: string;
    revisedStandardLabel: string;
    revisedStandardValue: string;
    healthImplicationLabel: string;
    healthAdverseAll: string;
    healthSensitiveHazard: string;
    healthAcceptable: string;
    rawSevereSpikeBadge: string;
    scaleNoteTitle: string;
    scaleNoteBodyTemplate: string;
    scaleNoteGoodBodyTemplate: string;
    subIndicesTitle: string;
    subIndexAriaLabel: string;
    cpcbCategoryLabels: Record<CpcbCategory, string>;
    epaCategoryLabels: Record<UsEpaCategory, string>;
    stationSkewTitle: string;
    microHotspotBadge: string;
    greenBufferBadge: string;
    consistentStationBadge: string;
    stationLabel: string;
    stationAqiLabel: string;
    stationPm25Label: string;
    modelSkewLabel: string;
  };
  diurnal: {
    eyebrow: string;
    title: string;
    description: string;
    convectiveMixingBadge: string;
    cleanestToday: string;
    worstToday: string;
    cleanestTomorrow: string;
    worstTomorrow: string;
    todayLabel: string;
    tomorrowLabel: string;
    avgUnit: string;
    peakUnit: string;
    timelineTitle: string;
    timelineSubtitle: string;
    timeLabel: string;
    pm25Label: string;
    humidityLabel: string;
    recommendedWindowTag: string;
    avoidWindowTag: string;
    neutralWindowTag: string;
    archetypeSelectorLabel: string;
    ventilationUnit: string;
    doseComparisonTitle: string;
    baselineDoseLabel: string;
    shiftedDoseLabel: string;
    netSparedLabel: string;
    baselineSubLabel: string;
    shiftedSubLabel: string;
    sparedSubLabel: string;
    interactiveTimelineAria: string;
    hourBarAria: string;
    nocturnalInversionNote: string;
    archetypeLabels: Record<HouseholdArchetype, string>;
  };
  indoor: {
    eyebrow: string;
    title: string;
    description: string;
    roomDimensionsTitle: string;
    lengthLabel: string;
    widthLabel: string;
    heightLabel: string;
    volumeLabel: string;
    comparisonBarsTitle: string;
    openWindowsLabel: string;
    closedNoFilterLabel: string;
    closedHepaLabel: string;
    infiltrationLabel: string;
    targetCadrTitle: string;
    targetInfiltrationBadge: string;
    cleanAirDeliveryLabel: string;
    requiredCadrSubLabel: string;
    imperialCadrLabel: string;
    imperialFlowLabel: string;
    airExchangeLabel: string;
    achSubLabel: string;
    combustionAuditTitle: string;
    combustionAuditSubtitle: string;
    triggerSelectLabel: string;
    emissionPeakLabel: string;
    clearance90Label: string;
    minutesUnit: string;
    acuteSpikeLabel: string;
    literatureCitationLabel: string;
    combustionLabels: Record<CombustionEventType, string>;
  };
  upwind: {
    eyebrow: string;
    title: string;
    description: string;
    satelliteBadge: string;
    satelliteFireCountLabel: string;
    nearestFireDistanceLabel: string;
    windVectorLabel: string;
    dispersionOutlookTitle: string;
    upwindAlignedTitle: string;
    crosswindTitle: string;
    noneDetectedTitle: string;
    withinBboxNote: string;
    geodesicNote: string;
    directionLabel: string;
    noneValue: string;
    alignmentUpwindAligned: string;
    alignmentCrosswind: string;
    alignmentNoneDetected: string;
    scientificDisclaimers: Record<
      "upwind_aligned" | "crosswind" | "none_detected",
      string
    >;
  };
  community: {
    eyebrow: string;
    title: string;
    description: string;
    grapPrefix: string;
    citizenMandateTitle: string;
    rwaMandateTitle: string;
    carpoolSimulatorTitle: string;
    modalShiftBadge: string;
    commuteDistanceLabel: string;
    chosenModeLabel: string;
    speedUnit: string;
    co2AvoidedLabel: string;
    tailpipeSparedNote: string;
    pm25AvoidedLabel: string;
    pm25AvoidedNote: string;
    copyAdvisoryTitle: string;
    oneClickNoticeLabel: string;
    copyAdvisoryButton: string;
    copiedSuccess: string;
    clipboardBlockedError: string;
    shareWhatsAppButton: string;
    shareTelegramButton: string;
    caqmHotlineLabel: string;
    commuteModeLabels: Record<CommuteMode, string>;
    grapStageNames: Record<GrapStageId, string>;
    grapSeverityLabels: Record<GrapStageId, string>;
    grapChecklistActions: Record<string, string>;
  };
  errorBoundary: {
    defaultTitle: string;
    defaultBody: string;
    retryButton: string;
    dualScaleTitle: string;
    diurnalTitle: string;
    indoorTitle: string;
    upwindTitle: string;
    communityTitle: string;
  };
  attributions: {
    title: string;
    camsCredit: string;
    waqiCredit: string;
    openaqCredit: string;
    nasaFirmsCredit: string;
    googleMapsCredit: string;
    medicalDisclaimerTitle: string;
    disclaimer: string;
    footerTagline: string;
    footerSubTagline: string;
  };
}

export const DICTIONARY: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    app: {
      title: "VayuShield",
      subtitle: "Urban Air Quality & Clean-Air Exposure Navigator",
      skipToMain: "Skip to main content",
      liveIndicator: "Connected to Satellite & Ground Stations",
      offlineIndicator: "Using High-Precision Local In-Memory Cache",
      refreshButton: "Sync Live Data",
      refreshing: "Syncing Upstream Feeds...",
      citySelectorLabel: "Target City / Monitoring Station:",
      languageToggle: "हिंदी में देखें",
      quickPresets: "Quick Presets",
      syncNoticePrefix: "Sync Notice:",
      syncFallbackSuffix: "Using deterministic local atmospheric physics fallback.",
      briefingHeading: "Clinical & Household Health Briefing",
      briefingDeterministicBadge: "Deterministic Verified Guidance",
      briefingGeminiBadge: "Gemini 4 Guarded Guidance",
      briefingArchetypeNote: "Active profile",
      opensInNewTab: "opens in new tab",
      actionLabels: {
        hepa_filtration_active: "HEPA filtration active",
        hepa_purifier_active: "HEPA purifier active",
        hepa_purifier_continuous: "HEPA purifier continuous",
        active_hepa_purifier: "Active HEPA purifier",
        n95_respirator_mandatory: "N95 respirator mandatory",
        respirator_mask_seal: "Respirator mask seal",
        shift_outdoor_to_cleanest_window: "Shift outdoor to cleanest window",
        shift_outdoor_hours: "Shift outdoor hours",
        avoid_peak_inversion: "Avoid peak inversion",
        keep_windows_sealed: "Keep windows sealed",
        avoid_indoor_combustion: "Avoid indoor combustion",
        avoid_biomass_burning: "Avoid biomass burning",
      },
    },
    dualScale: {
      eyebrow: "Comparative Metrology",
      title: "Dual-Scale Reality Check",
      description:
        "Contrasting India CPCB NAQI against revised May 2024 US EPA epidemiological thresholds.",
      humidityLabel: "Humidity",
      rhAdjustedLabel: "RH Adjusted",
      rhAdjustedTitle: "Optical sensor hygroscopic swelling correction applied",
      cpcbHeader: "India CPCB National AQI",
      cpcbCategoryPrefix: "CPCB Category",
      epaHeader: "US EPA May 2024 Revised AQI",
      epaCategoryPrefix: "US EPA Category",
      pm25InputLabel: "PM2.5 Input:",
      dominantPollutantLabel: "Dominant Pollutant:",
      revisedStandardLabel: "Revised Standard:",
      revisedStandardValue: "9.0 µg/m³ Good Threshold",
      healthImplicationLabel: "Health Implication:",
      healthAdverseAll: "Adverse for all persons",
      healthSensitiveHazard: "Respiratory hazard for sensitive",
      healthAcceptable: "Acceptable for healthy adults",
      rawSevereSpikeBadge: "Raw severe particulate spike exceeds 500 cap",
      scaleNoteTitle: "Dual-Scale Reading Note",
      scaleNoteBodyTemplate:
        "At PM2.5 {pm25} µg/m³, India CPCB rates overall air quality as {cpcbCategory} (AQI {cpcbAqi}{dominantSuffix}), while revised US EPA 2024 standards classify it as {epaCategory} (AQI {epaAqi}). Sensitive individuals (asthmatic children, older adults, and pregnant persons) may benefit from gentler outdoor pacing and indoor filtration.",
      scaleNoteGoodBodyTemplate:
        "At PM2.5 {pm25} µg/m³, both India CPCB ({cpcbCategory}, AQI {cpcbAqi}{dominantSuffix}) and US EPA 2024 ({epaCategory}, AQI {epaAqi}) indicate clean ambient air quality suitable for normal outdoor activities.",
      subIndicesTitle: "Six-Pollutant Sub-Index Breakdown",
      subIndexAriaLabel: "{pollutant} sub-index {value}",
      cpcbCategoryLabels: {
        Good: "Good",
        Satisfactory: "Satisfactory",
        Moderate: "Moderate",
        Poor: "Poor",
        "Very Poor": "Very Poor",
        Severe: "Severe",
      },
      epaCategoryLabels: {
        Good: "Good",
        Moderate: "Moderate",
        "Unhealthy for Sensitive Groups": "Unhealthy for Sensitive Groups",
        Unhealthy: "Unhealthy",
        "Very Unhealthy": "Very Unhealthy",
        Hazardous: "Hazardous",
      },
      stationSkewTitle: "Local Monitoring Station Skew Check",
      microHotspotBadge: "MICRO-HOTSPOT DETECTED",
      greenBufferBadge: "URBAN GREEN BUFFER",
      consistentStationBadge: "STATION CONSISTENCY",
      stationLabel: "Station",
      stationAqiLabel: "Station AQI",
      stationPm25Label: "Station PM2.5",
      modelSkewLabel: "Model Skew",
    },
    diurnal: {
      eyebrow: "Planetary Boundary Layer Dynamics",
      title: "48-Hour Diurnal Clean-Air Window Optimizer",
      description:
        "Exploits nocturnal thermal inversion trapping and afternoon convective planetary boundary layer mixing to minimize respiratory exposure.",
      convectiveMixingBadge: "Convective Mixing Peak: 13:00–16:00",
      cleanestToday: "Cleanest Window (Today)",
      worstToday: "Worst Peak Window (Today)",
      cleanestTomorrow: "Cleanest Window (Tomorrow)",
      worstTomorrow: "Worst Peak Window (Tomorrow)",
      todayLabel: "Today",
      tomorrowLabel: "Tomorrow",
      avgUnit: "µg/m³ avg",
      peakUnit: "µg/m³ peak",
      timelineTitle: "48-Hour Hourly Particulate Timeline",
      timelineSubtitle: "Interactive Continuous Scrubber",
      timeLabel: "Time:",
      pm25Label: "PM2.5:",
      humidityLabel: "Humidity:",
      recommendedWindowTag: "Recommended clean window",
      avoidWindowTag: "Peak exposure window",
      neutralWindowTag: "Standard hourly reading",
      archetypeSelectorLabel: "Household Archetype (Breathing Rate):",
      ventilationUnit: "L/min ventilation",
      doseComparisonTitle: "Pulmonary Inhaled Dose Comparison",
      baselineDoseLabel: "Peak Schedule Inhaled Dose:",
      shiftedDoseLabel: "Shifted Clean Window Inhaled Dose:",
      netSparedLabel: "Net Toxic Mass Spared:",
      baselineSubLabel: "2-hour peak exposure",
      shiftedSubLabel: "2-hour clean window",
      sparedSubLabel: "µg toxic particulate spared",
      interactiveTimelineAria:
        "48-hour hourly air quality timeline. Use left and right arrow keys, Home, or End to inspect hourly forecasts.",
      hourBarAria: "{day} at {time}: PM2.5 {pm25} µg/m³. {cleanStatus}",
      nocturnalInversionNote:
        "Winter nocturnal inversions in North India compress surface pollutants into a shallow 100-meter boundary layer between 04:00 and 09:00. Solar heating between 13:00 and 16:30 expands the mixing layer to 1200+ meters, diluting surface particulate density.",
      archetypeLabels: {
        child_asthma: "Child with Asthma",
        older_adult_walker: "Older Adult (Morning Walker)",
        office_commuter: "Office Commuter",
        general_adult: "General Adult",
      },
    },
    indoor: {
      eyebrow: "First-Principles Microenvironment Physics",
      title: "Indoor Single-Zone Mass Balance Shelter Audit",
      description:
        "First-principles steady-state physics modeling indoor infiltration and sizing HEPA Clean Air Delivery Rate (CADR).",
      roomDimensionsTitle: "Room Geometry & Volume Sizing",
      lengthLabel: "Length (m):",
      widthLabel: "Width (m):",
      heightLabel: "Height (m):",
      volumeLabel: "Room Volume:",
      comparisonBarsTitle: "Steady-State Indoor PM2.5 Infiltration Regimes",
      openWindowsLabel: "Open Windows Baseline (~92% Infiltration)",
      closedNoFilterLabel: "Closed Windows Only (~81% Infiltration)",
      closedHepaLabel: "Closed Windows + Sized HEPA Purifier (~21% Infiltration)",
      infiltrationLabel: "Infiltration:",
      targetCadrTitle: "CADR Sizing for ≤ 21% Infiltration (or WHO Targets)",
      targetInfiltrationBadge: "Target Infiltration: ≤ 21%",
      cleanAirDeliveryLabel: "Clean Air Delivery",
      requiredCadrSubLabel: "Required CADR (m³/h)",
      imperialCadrLabel: "Imperial CADR",
      imperialFlowLabel: "Imperial flow rate",
      airExchangeLabel: "Air Exchange Rate",
      achSubLabel: "Air changes per hour",
      combustionAuditTitle: "Acute Indoor Combustion Spike Estimator",
      combustionAuditSubtitle:
        "Discrete residential emission events and exponential decay clearance times (t_rec = ln(10) / k_total).",
      triggerSelectLabel: "Simulate Residential Combustion Event",
      emissionPeakLabel: "Peak:",
      clearance90Label: "Clearance Time to 90%:",
      minutesUnit: "min",
      acuteSpikeLabel: "Simulated Peak Indoor Spike:",
      literatureCitationLabel: "Scientific Literature Citation:",
      combustionLabels: {
        unvented_frying: "Unvented High-Heat Frying / Tadka",
        mosquito_coil: "Mosquito Repellent Coil (Smoldering)",
        incense_stick: "Incense Stick / Agarbatti Burning",
      },
    },
    upwind: {
      eyebrow: "Remote Sensing & Boundary Trajectory",
      title: "Upwind Satellite Thermal Anomalies & Meteorology",
      description:
        "NASA FIRMS active agricultural fire tracking paired with local planetary boundary layer wind vectors.",
      satelliteBadge: "NASA FIRMS VIIRS S-NPP",
      satelliteFireCountLabel: "Active Regional Fires (±1.5° Box):",
      nearestFireDistanceLabel: "Nearest Detected Fire Distance:",
      windVectorLabel: "Current Ground Wind Vector:",
      dispersionOutlookTitle: "Regional Smoke Transport Outlook",
      upwindAlignedTitle: "Upwind Plume Aligned",
      crosswindTitle: "Crosswind / Lateral Dispersion",
      noneDetectedTitle: "No Direct Upwind Plume",
      withinBboxNote: "Within ±1.5° regional bounding box",
      geodesicNote: "Geodesic proximity to coordinates",
      directionLabel: "Direction:",
      noneValue: "None",
      alignmentUpwindAligned:
        "UPWIND ALIGNED: Ground wind direction directly aligns with regional active fire clusters. Boundary layer transport channels smoke plumes toward your coordinates.",
      alignmentCrosswind:
        "CROSSWIND / LATERAL DISPERSION: Regional smoke plumes are transported laterally relative to local wind vectors.",
      alignmentNoneDetected:
        "NO DIRECT UPWIND PLUME ALIGNMENT: Ground air mass transport is primarily dominated by local urban vehicular, industrial, and crustal sources.",
      scientificDisclaimers: {
        upwind_aligned:
          "Active fire detections indicate regional agricultural or biomass thermal anomalies aligned with current wind vectors. Correlation with local air quality depends on planetary boundary layer height, nocturnal thermal inversion trapping, and atmospheric dispersion without implying single-source deterministic causation.",
        crosswind:
          "Active regional thermal anomalies are moving laterally across local wind vectors. Local air quality impacts depend on boundary layer mixing depth and atmospheric dispersion without implying single-source deterministic causation.",
        none_detected:
          "No direct upwind active fire plume detected along local wind vectors. Ambient levels reflect local urban emissions, boundary layer height, and atmospheric dispersion without implying single-source deterministic causation.",
      },
    },
    community: {
      eyebrow: "Civic Defense & Statutory Directives",
      title: "Community & Society Smog Action Hub",
      description:
        "Delhi-NCR statutory Graded Response Action Plan (GRAP) enforcement and verified neighborhood bulletins.",
      grapPrefix: "GRAP",
      citizenMandateTitle: "Citizen Protection & Action Checklist",
      rwaMandateTitle: "RWA / Housing Society Enforcement Mandate",
      carpoolSimulatorTitle: "Neighborhood Transit & Carpool Savings Simulator",
      modalShiftBadge: "Modal Shift Calculator",
      commuteDistanceLabel: "Round-Trip Distance (km):",
      chosenModeLabel: "Proposed Clean Alternative",
      speedUnit: "km/h avg",
      co2AvoidedLabel: "Net Carbon Emissions Avoided:",
      tailpipeSparedNote: "Tailpipe greenhouse emission spared",
      pm25AvoidedLabel: "Personal Toxic PM2.5 Inhalation Avoided:",
      pm25AvoidedNote: "µg PM2.5 pulmonary dose avoided",
      copyAdvisoryTitle: "Copy RWA / School WhatsApp Advisory",
      oneClickNoticeLabel: "One-Click Citizen Notice",
      copyAdvisoryButton: "Copy RWA / School WhatsApp Advisory",
      copiedSuccess: "Copied to Clipboard!",
      clipboardBlockedError: "Clipboard access blocked; copy text from preview above.",
      shareWhatsAppButton: "Share on WhatsApp",
      shareTelegramButton: "Share on Telegram",
      caqmHotlineLabel: "CAQM Hotline:",
      commuteModeLabels: {
        private_petrol_car: "Private Petrol Car (Single Occupant)",
        two_wheeler: "Two-Wheeler (Motorcycle / Scooter)",
        metro_transit: "Delhi Metro (DMRC)",
        work_from_home: "Work From Home (Zero Commute)",
      },
      grapStageNames: {
        stage_0: "Normal / Moderate Baseline",
        stage_1: "Stage I ('Poor')",
        stage_2: "Stage II ('Very Poor')",
        stage_3: "Stage III ('Severe')",
        stage_4: "Stage IV ('Severe+')",
      },
      grapSeverityLabels: {
        stage_0: "Normal",
        stage_1: "Poor",
        stage_2: "Very Poor",
        stage_3: "Severe",
        stage_4: "Severe+",
      },
      grapChecklistActions: {
        c0_1: "Maintain valid PUC certificate and ensure correct tire pressure",
        r0_1: "Ensure municipal waste collection without burning leaves/waste",
        c1_1: "Turn off vehicle engine at red lights and traffic stalls",
        c1_2: "Do not dispose of garden waste or garbage by burning",
        r1_1: "Prohibit sweeping without water sprinkling inside residential societies",
        c2_1: "Switch daily commute to Delhi Metro or public bus; avoid solo car drives",
        c2_2: "Replace residential and automotive air filters (HEPA / cabin filter)",
        r2_1: "Mandate electric room heaters for security guards and staff to prevent wood/coal fires",
        c3_1: "Work from home (WFH) if permitted; strictly avoid outdoor physical exercise",
        c3_2: "Equip fitted N95/FFP2 respirator masks whenever stepping outdoors",
        r3_1: "Halt all renovation, drilling, and interior masonry inside society apartments",
        c4_1: "Vulnerable individuals (children, elders, cardiac/pulmonary patients) remain indoors in sealed HEPA spaces",
        c4_2: "Enforce 100% remote work wherever digitally viable",
        r4_1: "Activate community clean-air shelters in clubhouse/common halls equipped with high-CADR HEPA filters",
      },
    },
    errorBoundary: {
      defaultTitle: "Panel Render Recovery",
      defaultBody: "An unexpected calculation or display error occurred in this module.",
      retryButton: "Retry Panel",
      dualScaleTitle: "Dual-Scale Card Recovery",
      diurnalTitle: "Diurnal Planner Recovery",
      indoorTitle: "Indoor Shelter Audit Recovery",
      upwindTitle: "Upwind Context Recovery",
      communityTitle: "Community Hub Recovery",
    },
    attributions: {
      title: "Mandatory Data Attributions & Science Acknowledgements",
      camsCredit:
        "Air quality forecast and atmospheric composition data provided by Open-Meteo under Copernicus Atmosphere Monitoring Service (CAMS), European Union (licensed under CC BY 4.0).",
      waqiCredit:
        "Real-time ground station observations provided by World Air Quality Index Project (WAQI / AQICN) in partnership with the Central Pollution Control Board (CPCB) and State Pollution Control Boards.",
      openaqCredit:
        "Ground reference air sensor data provided by the OpenAQ Global Air Quality Community via OpenAQ v3 API.",
      nasaFirmsCredit:
        "Thermal anomalies and active fire satellite detections provided by NASA FIRMS (VIIRS SNPP NRT / EOSDIS, NASA Earthdata).",
      googleMapsCredit:
        "Localized air quality index and mapping courtesy of Google Maps Platform Air Quality API.",
      medicalDisclaimerTitle: "Medical Disclaimer",
      disclaimer:
        "VayuShield provides environmental risk assessments based on deterministic mathematical models and public atmospheric science feeds. Consult certified healthcare providers for clinical diagnosis and acute symptom management.",
      footerTagline:
        "VayuShield Deterministic Physics & Air Quality Index Kernel · PromptWars Virtual Challenge 6",
      footerSubTagline: "Open Science & High-Integrity Environmental Metrology",
    },
  },
  hi: {
    app: {
      title: "वायुशील्ड (VayuShield)",
      subtitle: "शहरी वायु गुणवत्ता एवं स्वच्छ-हवा सुरक्षा नेविगेटर",
      skipToMain: "मुख्य सामग्री पर जाएं",
      liveIndicator: "उपग्रह व निकटतम निगरानी स्टेशनों से जुड़ा",
      offlineIndicator: "उच्च-सटीक स्थानीय स्मृति (Cache) का उपयोग",
      refreshButton: "ताजा डेटा प्राप्त करें",
      refreshing: "डेटा लोड हो रहा है...",
      citySelectorLabel: "शहर / स्टेशन चयन:",
      languageToggle: "View in English",
      quickPresets: "त्वरित शहर",
      syncNoticePrefix: "सिंक सूचना:",
      syncFallbackSuffix: "स्थानीय भौतिकी मॉडल बैकअप का उपयोग किया जा रहा है।",
      briefingHeading: "स्वास्थ्य एवं परिवार सुरक्षा ब्रीफिंग",
      briefingDeterministicBadge: "सत्यापित भौतिकी मार्गदर्शन",
      briefingGeminiBadge: "जेमिनी 4 सुरक्षित मार्गदर्शन",
      briefingArchetypeNote: "चयनित वर्ग",
      opensInNewTab: "नए टैब में खुलेगा",
      actionLabels: {
        hepa_filtration_active: "HEPA एयर फिल्ट्रेशन सक्रिय रखें",
        hepa_purifier_active: "HEPA प्यूरीफायर सक्रिय रखें",
        hepa_purifier_continuous: "निरंतर HEPA प्यूरीफायर चलाएं",
        active_hepa_purifier: "सक्रिय HEPA प्यूरीफायर",
        n95_respirator_mandatory: "N95 मास्क अनिवार्य",
        respirator_mask_seal: "फिटेड N95 मास्क का उपयोग करें",
        shift_outdoor_to_cleanest_window: "बाहरी गतिविधि सबसे स्वच्छ समय में करें",
        shift_outdoor_hours: "बाहरी समय को स्वच्छ अवधि में बदलें",
        avoid_peak_inversion: "चरम प्रदूषण समय से बचें",
        keep_windows_sealed: "खिड़कियां बंद रखें",
        avoid_indoor_combustion: "घर के अंदर धुएं/दहन से बचें",
        avoid_biomass_burning: "कचरा व लकड़ी जलाने से बचें",
      },
    },
    dualScale: {
      eyebrow: "तुलनात्मक मापन (Comparative Metrology)",
      title: "द्वि-पैमाना वास्तविकता जांच (Dual-Scale Reality Check)",
      description:
        "भारतीय सीपीसीबी (CPCB) सूचकांक की अंतरराष्ट्रीय यूएस ईपीए (US EPA 2024) स्वास्थ्य मानकों से तुलना।",
      humidityLabel: "नमी",
      rhAdjustedLabel: "नमी समायोजित",
      rhAdjustedTitle: "उच्च आर्द्रता ऑप्टिकल सेंसर सुधार सक्रिय",
      cpcbHeader: "भारत CPCB राष्ट्रीय एक्यूआई",
      cpcbCategoryPrefix: "सीपीसीबी श्रेणी",
      epaHeader: "US EPA मई 2024 संशोधित एक्यूआई",
      epaCategoryPrefix: "यूएस ईपीए श्रेणी",
      pm25InputLabel: "PM2.5 माप:",
      dominantPollutantLabel: "प्रमुख प्रदूषक:",
      revisedStandardLabel: "संशोधित मानक:",
      revisedStandardValue: "9.0 µg/m³ स्वच्छ सीमा",
      healthImplicationLabel: "स्वास्थ्य प्रभाव:",
      healthAdverseAll: "सभी के लिए हानिकारक",
      healthSensitiveHazard: "संवेदनशील वर्गों के लिए जोखिम",
      healthAcceptable: "स्वस्थ वयस्कों के लिए सामान्य",
      rawSevereSpikeBadge: "अत्यधिक कण स्तर 500 वैधानिक सीमा से ऊपर",
      scaleNoteTitle: "द्वि-स्तरीय पैमाना नोट",
      scaleNoteBodyTemplate:
        "PM2.5 {pm25} µg/m³ पर, भारत CPCB समग्र वायु गुणवत्ता को {cpcbCategory} (AQI {cpcbAqi}{dominantSuffix}) दर्शाता है, जबकि संशोधित US EPA 2024 मानक इसे {epaCategory} (AQI {epaAqi}) श्रेणी में रखते हैं। संवेदनशील व्यक्ति (दमा से पीड़ित बच्चे, बुजुर्ग, गर्भवती महिलाएं) बाहरी गतिविधि हल्की रखकर व इनडोर एयर फिल्टर से अतिरिक्त सुरक्षा पा सकते हैं।",
      scaleNoteGoodBodyTemplate:
        "PM2.5 {pm25} µg/m³ पर, भारत CPCB ({cpcbCategory}, AQI {cpcbAqi}{dominantSuffix}) और US EPA 2024 ({epaCategory}, AQI {epaAqi}) दोनों सामान्य बाहरी गतिविधियों के लिए स्वच्छ वायु गुणवत्ता दर्शाते हैं।",
      subIndicesTitle: "छह प्रदूषकों का उप-सूचकांक (Sub-Indices)",
      subIndexAriaLabel: "{pollutant} उप-सूचकांक {value}",
      cpcbCategoryLabels: {
        Good: "अच्छा",
        Satisfactory: "संतोषजनक",
        Moderate: "मध्यम",
        Poor: "खराब",
        "Very Poor": "अत्यधिक खराब",
        Severe: "गंभीर",
      },
      epaCategoryLabels: {
        Good: "अच्छा",
        Moderate: "मध्यम",
        "Unhealthy for Sensitive Groups": "संवेदनशील वर्गों के लिए अस्वास्थ्यकर",
        Unhealthy: "अस्वास्थ्यकर",
        "Very Unhealthy": "अत्यधिक अस्वास्थ्यकर",
        Hazardous: "खतरनाक",
      },
      stationSkewTitle: "निकटतम जमीनी स्टेशन विचलन जांच",
      microHotspotBadge: "स्थानीय हॉटस्पॉट सक्रिय",
      greenBufferBadge: "हरित क्षेत्र (Green Buffer)",
      consistentStationBadge: "स्टेशन डेटा सुसंगत",
      stationLabel: "निगरानी स्टेशन",
      stationAqiLabel: "स्टेशन AQI",
      stationPm25Label: "स्टेशन PM2.5",
      modelSkewLabel: "मॉडल विचलन",
    },
    diurnal: {
      eyebrow: "वायुमंडलीय सीमा परत गतिकी",
      title: "48-घंटे स्वच्छ-हवा दैनिक समय अनुकूलक (Diurnal Optimizer)",
      description:
        "रात के प्रदूषण जमाव (Inversion) और दोपहर की धूप वाली वायुमंडलीय सफाई का उपयोग करके फेफड़ों में जाने वाले विषैले कणों को कम करें।",
      convectiveMixingBadge: "दोपहर फैलाव शिखर: 13:00–16:00",
      cleanestToday: "आज का सबसे स्वच्छ समय",
      worstToday: "आज का सबसे गंभीर प्रदूषित समय",
      cleanestTomorrow: "कल का सबसे स्वच्छ समय",
      worstTomorrow: "कल का सबसे गंभीर प्रदूषित समय",
      todayLabel: "आज",
      tomorrowLabel: "कल",
      avgUnit: "µg/m³ औसत",
      peakUnit: "µg/m³ शिखर",
      timelineTitle: "48-घंटे प्रति घंटा कण टाइमलाइन",
      timelineSubtitle: "इंटरैक्टिव समय स्क्रबर",
      timeLabel: "समय:",
      pm25Label: "PM2.5:",
      humidityLabel: "नमी:",
      recommendedWindowTag: "सुझाया गया स्वच्छ समय",
      avoidWindowTag: "अधिकतम प्रदूषण समय",
      neutralWindowTag: "सामान्य प्रति घंटा माप",
      archetypeSelectorLabel: "परिवार के सदस्य की संवेदनशीलता (श्वसन दर):",
      ventilationUnit: "L/min श्वसन दर",
      doseComparisonTitle: "फेफड़ों में जाने वाले PM2.5 कणों की तुलना",
      baselineDoseLabel: "अधिकतम प्रदूषण समय में श्वसन:",
      shiftedDoseLabel: "स्वच्छ समय में श्वसन:",
      netSparedLabel: "फेफड़ों में जाने से बचा विषैला धुआं:",
      baselineSubLabel: "2-घंटे चरम प्रदूषण अवधि",
      shiftedSubLabel: "2-घंटे स्वच्छ अवधि",
      sparedSubLabel: "µg विषैले कणों से बचाव",
      interactiveTimelineAria:
        "48-घंटे का प्रति घंटा वायु गुणवत्ता ग्राफ। प्रति घंटा पूर्वानुमान देखने के लिए बाएं और दाएं तीर कुंजियों, Home या End का उपयोग करें।",
      hourBarAria: "{day} समय {time}: PM2.5 {pm25} µg/m³. {cleanStatus}",
      nocturnalInversionNote:
        "उत्तर भारत में सर्दियों में रात 04:00 से सुबह 09:00 तक धुआं जमीन से 100 मीटर की ऊंचाई पर फंस जाता है। दोपहर 13:00 से 16:30 बजे के बीच धूप से यह परत 1200+ मीटर फैलकर हवा को काफी हद तक पतला व स्वच्छ कर देती है।",
      archetypeLabels: {
        child_asthma: "दमा पीड़ित बच्चा",
        older_adult_walker: "वरिष्ठ नागरिक (प्रातः भ्रमण)",
        office_commuter: "दैनिक ऑफिस यात्री",
        general_adult: "सामान्य वयस्क",
      },
    },
    indoor: {
      eyebrow: "सूक्ष्म-वातावरण भौतिकी मॉडल",
      title: "इनडोर शेल्टर एवं घरेलू दहन सुरक्षा ऑडिट",
      description:
        "कमरे के आयतन के अनुसार इनडोर प्रदूषण का सही भौतिक मॉडल और हेपा (HEPA) एयर प्यूरीफायर की आवश्यक क्षमता।",
      roomDimensionsTitle: "कमरे का आकार व वायु आयतन",
      lengthLabel: "लंबाई (मीटर):",
      widthLabel: "चौड़ाई (मीटर):",
      heightLabel: "ऊंचाई (मीटर):",
      volumeLabel: "कमरे का आयतन:",
      comparisonBarsTitle: "इनडोर PM2.5 प्रदूषण की स्थिति",
      openWindowsLabel: "खुली खिड़कियां (~92% बाहरी धुआं अंदर)",
      closedNoFilterLabel: "केवल खिड़कियां बंद (~81% धुआं अंदर)",
      closedHepaLabel: "खिड़कियां बंद + सही आकार का HEPA प्यूरीफायर (~21% धुआं)",
      infiltrationLabel: "अंतःस्रवण:",
      targetCadrTitle: "21% से कम इनडोर प्रदूषण के लिए आवश्यक CADR क्षमता",
      targetInfiltrationBadge: "लक्ष्य अंतःस्रवण: ≤ 21%",
      cleanAirDeliveryLabel: "स्वच्छ वायु वितरण",
      requiredCadrSubLabel: "आवश्यक CADR (m³/h)",
      imperialCadrLabel: "इंपीरियल CADR",
      imperialFlowLabel: "वायु प्रवाह दर",
      airExchangeLabel: "वायु परिवर्तन दर",
      achSubLabel: "प्रति घंटे हवा बदलाव",
      combustionAuditTitle: "घरेलू धुएं (Combustion) का खतरा व सफाई का समय",
      combustionAuditSubtitle:
        "घर के अंदर होने वाले उत्सर्जन और हवा साफ होने में लगने वाला समय (t_rec = ln(10) / k_total)।",
      triggerSelectLabel: "घर के अंदर धुएं का स्रोत चुनें",
      emissionPeakLabel: "शिखर:",
      clearance90Label: "90% सफाई समय:",
      minutesUnit: "मिनट",
      acuteSpikeLabel: "कमरे में अचानक बढ़ा प्रदूषण:",
      literatureCitationLabel: "वैज्ञानिक शोध संदर्भ:",
      combustionLabels: {
        unvented_frying: "बिना एग्जॉस्ट तेज आंच पर तलना / तड़का",
        mosquito_coil: "मच्छर भगाने वाली कॉइल (सुलगती हुई)",
        incense_stick: "अगरबत्ती / धूप बत्ती जलाना",
      },
    },
    upwind: {
      eyebrow: "उपग्रह रिमोट सेंसिंग एवं पवन पथ",
      title: "उपग्रह से पराली/आग की निगरानी एवं मौसम विज्ञान",
      description:
        "नासा (NASA FIRMS) उपग्रह द्वारा क्षेत्रीय आग की पहचान और स्थानीय हवा की दिशा का विश्लेषण।",
      satelliteBadge: "NASA FIRMS VIIRS S-NPP",
      satelliteFireCountLabel: "क्षेत्रीय सक्रिय आग के स्थान (±1.5° क्षेत्र):",
      nearestFireDistanceLabel: "सबसे निकटतम आग की दूरी:",
      windVectorLabel: "वर्तमान जमीनी हवा की दिशा व गति:",
      dispersionOutlookTitle: "धुआं परिवहन और फैलाव की स्थिति",
      upwindAlignedTitle: "सीधी हवा में धुआं संरेखित",
      crosswindTitle: "तिरछी हवा / पार्श्व फैलाव",
      noneDetectedTitle: "कोई सीधा उपरि-पवन धुआं नहीं",
      withinBboxNote: "±1.5° क्षेत्रीय सीमा के भीतर",
      geodesicNote: "निर्देशांकों से भू-दूरी",
      directionLabel: "दिशा:",
      noneValue: "कोई नहीं",
      alignmentUpwindAligned:
        "सीधी हवा का प्रभाव (Upwind Aligned): हवा की दिशा सीधे तौर पर पराली/आग वाले क्षेत्रों से आपकी ओर आ रही है। धुआं सीधे तौर पर आपके क्षेत्र में प्रवेश कर रहा है।",
      alignmentCrosswind:
        "तिरछी हवा (Crosswind): धुआं आपके क्षेत्र के अगल-बगल से होकर निकल रहा है।",
      alignmentNoneDetected:
        "कोई सीधा धुआं प्रवाह नहीं: वर्तमान प्रदूषण मुख्य रूप से स्थानीय वाहनों, उद्योगों और सड़क की धूल के कारण है।",
      scientificDisclaimers: {
        upwind_aligned:
          "सक्रिय आग के संकेत वर्तमान पवन दिशा के साथ संरेखित क्षेत्रीय कृषि या बायोमास तापीय विसंगतियों को दर्शाते हैं। स्थानीय वायु गुणवत्ता पर इनका प्रभाव वायुमंडलीय सीमा परत की ऊंचाई, रात्रिकालीन इनवर्जन और फैलाव पर निर्भर करता है, न कि किसी एकल स्रोत के निश्चित कारण पर।",
        crosswind:
          "क्षेत्रीय तापीय विसंगतियां स्थानीय हवा की दिशा के तिरछे (पार्श्व) गुजर रही हैं। स्थानीय वायु गुणवत्ता पर प्रभाव वायुमंडलीय सीमा परत की गहराई और फैलाव पर निर्भर करता है, न कि किसी एकल स्रोत के निश्चित कारण पर।",
        none_detected:
          "स्थानीय हवा की दिशा में कोई सीधा उपरि-पवन आग का धुआं नहीं मिला है। वर्तमान स्तर मुख्य रूप से स्थानीय शहरी उत्सर्जन, सीमा परत की ऊंचाई और वायुमंडलीय फैलाव पर निर्भर करते हैं।",
      },
    },
    community: {
      eyebrow: "नागरिक सुरक्षा एवं वैधानिक निर्देश",
      title: "सामुदायिक व आरडब्ल्यूए (RWA) ग्रैप एक्शन हब",
      description:
        "दिल्ली-एनसीआर में लागू वैधानिक ग्रैप (GRAP) नियम, नागरिक कर्तव्य और साझा व्हाट्सएप परामर्श।",
      grapPrefix: "GRAP",
      citizenMandateTitle: "नागरिक स्वास्थ्य सुरक्षा चेकलिस्ट",
      rwaMandateTitle: "सोसायटी व आरडब्ल्यूए के लिए वैधानिक नियम",
      carpoolSimulatorTitle: "पड़ोस कारपूल व मेट्रो प्रदूषण बचत सिम्युलेटर",
      modalShiftBadge: "यात्रा विकल्प कैलकुलेटर",
      commuteDistanceLabel: "आने-जाने की दूरी (किमी):",
      chosenModeLabel: "प्रस्तावित स्वच्छ यात्रा विकल्प",
      speedUnit: "किमी/घंटा औसत",
      co2AvoidedLabel: "कार्बन उत्सर्जन में कुल बचत:",
      tailpipeSparedNote: "वाहन ग्रीनहाउस उत्सर्जन में बचत",
      pm25AvoidedLabel: "फेफड़ों में जाने से बचा जहरीला PM2.5:",
      pm25AvoidedNote: "µg PM2.5 श्वसन भार में कमी",
      copyAdvisoryTitle: "RWA / स्कूल व्हाट्सएप परामर्श कॉपी करें",
      oneClickNoticeLabel: "एक-क्लिक नागरिक सूचना",
      copyAdvisoryButton: "RWA / स्कूल व्हाट्सएप परामर्श कॉपी करें",
      copiedSuccess: "कॉपी हो गया!",
      clipboardBlockedError: "क्लिपबोर्ड अवरुद्ध है; ऊपर दिए गए पूर्वावलोकन से टेक्स्ट कॉपी करें।",
      shareWhatsAppButton: "व्हाट्सएप पर शेयर करें",
      shareTelegramButton: "टेलीग्राम पर शेयर करें",
      caqmHotlineLabel: "CAQM हेल्पलाइन:",
      commuteModeLabels: {
        private_petrol_car: "निजी पेट्रोल कार (एकल यात्री)",
        two_wheeler: "दोपहिया वाहन (बाइक / स्कूटर)",
        metro_transit: "दिल्ली मेट्रो (DMRC)",
        work_from_home: "वर्क फ्रॉम होम (शून्य यात्रा)",
      },
      grapStageNames: {
        stage_0: "सामान्य / मध्यम आधारभूत चरण",
        stage_1: "चरण I ('खराब')",
        stage_2: "चरण II ('अत्यधिक खराब')",
        stage_3: "चरण III ('गंभीर')",
        stage_4: "चरण IV ('अति गंभीर+')",
      },
      grapSeverityLabels: {
        stage_0: "सामान्य",
        stage_1: "खराब",
        stage_2: "अत्यधिक खराब",
        stage_3: "गंभीर",
        stage_4: "अति गंभीर+",
      },
      grapChecklistActions: {
        c0_1: "वैध पीयूसी (PUC) प्रमाणपत्र बनाए रखें और टायर का दबाव सही रखें",
        r0_1: "सूखे पत्ते या कचरा जलाए बिना नियमित नगर निगम कचरा संग्रहण सुनिश्चित करें",
        c1_1: "लाल बत्ती और ट्रैफिक जाम में वाहन का इंजन बंद रखें",
        c1_2: "बगीचे का सूखा कचरा या कूड़ा जलाकर नष्ट न करें",
        r1_1: "आवासीय सोसायटी के भीतर पानी छिड़काव के बिना सूखी झाड़ू लगाने पर रोक लगाएं",
        c2_1: "दैनिक यात्रा के लिए दिल्ली मेट्रो या सार्वजनिक बस अपनाएं; अकेले कार चलाने से बचें",
        c2_2: "घरेलू और वाहन के एयर फिल्टर (HEPA / केबिन फिल्टर) समय पर बदलें",
        r2_1: "लकड़ी या कोयला जलाने से रोकने के लिए सुरक्षा गार्डों व कर्मचारियों को इलेक्ट्रिक हीटर अनिवार्य रूप से दें",
        c3_1: "अनुमति हो तो घर से काम (WFH) करें; बाहर किसी भी शारीरिक व्यायाम से सख्ती से बचें",
        c3_2: "बाहर निकलते समय चेहरे पर सही फिट होने वाला N95/FFP2 मास्क अवश्य पहनें",
        r3_1: "सोसायटी के फ्लैटों में सभी नवीनीकरण, ड्रिलिंग और आंतरिक निर्माण कार्य तुरंत रोकें",
        c4_1: "संवेदनशील व्यक्ति (बच्चे, बुजुर्ग, हृदय व श्वास रोगी) HEPA फिल्टर वाले बंद कमरे के भीतर रहें",
        c4_2: "जहां डिजिटल रूप से संभव हो वहां 100% वर्क फ्रॉम होम (रिमोट कार्य) लागू करें",
        r4_1: "क्लबहाउस या कॉमन हॉल में उच्च-CADR HEPA फिल्टर युक्त सामुदायिक स्वच्छ-वायु आश्रय सक्रिय करें",
      },
    },
    errorBoundary: {
      defaultTitle: "पैनल पुनर्प्राप्ति (Recovery)",
      defaultBody: "इस मॉड्यूल में एक अप्रत्याशित गणना या प्रदर्शन त्रुटि हुई है।",
      retryButton: "पैनल पुनः प्रयास करें",
      dualScaleTitle: "द्वि-पैमाना कार्ड पुनर्प्राप्ति",
      diurnalTitle: "दैनिक समय अनुकूलक पुनर्प्राप्ति",
      indoorTitle: "इनडोर शेल्टर ऑडिट पुनर्प्राप्ति",
      upwindTitle: "उपरि-पवन संदर्भ पुनर्प्राप्ति",
      communityTitle: "सामुदायिक हब पुनर्प्राप्ति",
    },
    attributions: {
      title: "डेटा स्रोत व वैज्ञानिक आभार (Data Attributions)",
      camsCredit:
        "वायु गुणवत्ता पूर्वानुमान डेटा ओपन-मेटियो (Open-Meteo) व यूरोपीय संघ के कॉपरनिकस (CAMS) द्वारा (लाइसेंस CC BY 4.0)।",
      waqiCredit:
        "जमीनी स्टेशन डेटा वर्ल्ड एयर क्वालिटी इंडेक्स प्रोजेक्ट (WAQI/AQICN), केंद्रीय प्रदूषण नियंत्रण बोर्ड (CPCB) व राज्य प्रदूषण नियंत्रण बोर्डों द्वारा।",
      openaqCredit: "ओपनएक्यू (OpenAQ v3 API) वैश्विक वायु गुणवत्ता समुदाय द्वारा।",
      nasaFirmsCredit:
        "उपग्रह थर्मल और सक्रिय आग डेटा नासा फर्म्स (NASA FIRMS / EOSDIS, NASA Earthdata) द्वारा।",
      googleMapsCredit:
        "गूगल मैप्स प्लेटफॉर्म एयर क्वालिटी एपीआई (Google Maps Platform Air Quality API) के सहयोग से।",
      medicalDisclaimerTitle: "चिकित्सा अस्वीकरण (Medical Disclaimer)",
      disclaimer:
        "वायुशील्ड भौतिक गणितीय मॉडल और सार्वजनिक वायुमंडलीय डेटा पर आधारित जोखिम मूल्यांकन प्रदान करता है। किसी भी गंभीर स्वास्थ्य लक्षण में प्रमाणित डॉक्टर से सलाह लें।",
      footerTagline:
        "वायुशील्ड नियतात्मक भौतिकी एवं वायु गुणवत्ता सूचकांक कर्नेल · PromptWars Virtual Challenge 6",
      footerSubTagline: "मुक्त विज्ञान एवं उच्च-सत्यनिष्ठा पर्यावरणीय मापन",
    },
  },
};
