/**
 * VayuShield Bilingual Dictionary
 * Module: dictionary.ts
 *
 * Full typed parity between English ('en') and Hindi ('hi').
 * Provides accessible, culturally grounded environmental health copy,
 * clinical instructions, and society advisories.
 */

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
    descriptionEn: "Deccan plateau plateau urban zone",
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
    tagline: string;
    liveIndicator: string;
    offlineIndicator: string;
    refreshButton: string;
    refreshing: string;
    citySelectorLabel: string;
    languageToggle: string;
    quickPresets: string;
  };
  dualScale: {
    title: string;
    description: string;
    cpcbHeader: string;
    cpcbCategoryPrefix: string;
    epaHeader: string;
    epaCategoryPrefix: string;
    satisfactoryIllusionTitle: string;
    satisfactoryIllusionBody: string;
    subIndicesTitle: string;
    subIndicesDescription: string;
    stationSkewTitle: string;
    microHotspotAlert: string;
    greenBufferAlert: string;
    consistentStationAlert: string;
    opticalRhAlert: string;
    rawVsCapped: string;
  };
  diurnal: {
    title: string;
    description: string;
    cleanestToday: string;
    worstToday: string;
    cleanestTomorrow: string;
    worstTomorrow: string;
    recommendedWindowTag: string;
    avoidWindowTag: string;
    archetypeSelectorLabel: string;
    doseComparisonTitle: string;
    doseComparisonSubtitle: string;
    baselineDoseLabel: string;
    shiftedDoseLabel: string;
    netSparedLabel: string;
    reductionPercentageLabel: string;
    airVolumeInhaledLabel: string;
    interactiveTimelineAria: string;
    hourBarAria: string;
    nocturnalInversionNote: string;
  };
  indoor: {
    title: string;
    description: string;
    roomDimensionsTitle: string;
    lengthLabel: string;
    widthLabel: string;
    heightLabel: string;
    volumeLabel: string;
    outdoorConcentrationLabel: string;
    comparisonBarsTitle: string;
    openWindowsLabel: string;
    closedNoFilterLabel: string;
    closedHepaLabel: string;
    targetCadrTitle: string;
    targetCadrAchieved: string;
    targetCadrNeeded: string;
    combustionAuditTitle: string;
    combustionAuditSubtitle: string;
    triggerSelectLabel: string;
    acuteSpikeLabel: string;
    clearanceTimeClosed: string;
    clearanceTimeHepa: string;
    clearanceTimeFlush: string;
    chemicalHazardsLabel: string;
    literatureCitationLabel: string;
    safetyAdviceLabel: string;
  };
  upwind: {
    title: string;
    description: string;
    satelliteFireCountLabel: string;
    nearestFireDistanceLabel: string;
    windVectorLabel: string;
    dispersionOutlookTitle: string;
    alignmentUpwindAligned: string;
    alignmentCrosswind: string;
    alignmentNoneDetected: string;
    scientificDisclaimer: string;
  };
  community: {
    title: string;
    description: string;
    grapStageBadge: string;
    citizenMandateTitle: string;
    rwaMandateTitle: string;
    carpoolSimulatorTitle: string;
    commuteDistanceLabel: string;
    baselineModeLabel: string;
    chosenModeLabel: string;
    co2AvoidedLabel: string;
    pm25AvoidedLabel: string;
    copyAdvisoryButton: string;
    copiedSuccess: string;
    shareWhatsAppButton: string;
    shareTelegramButton: string;
    bulletinSubject: string;
    openBurningHelpline: string;
  };
  attributions: {
    title: string;
    camsCredit: string;
    waqiCredit: string;
    openaqCredit: string;
    nasaFirmsCredit: string;
    googleMapsCredit: string;
    disclaimer: string;
  };
}

export const DICTIONARY: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    app: {
      title: "VayuShield",
      subtitle: "Urban Air Quality & Clean-Air Exposure Navigator",
      tagline:
        "Deterministic environmental physics, diurnal exposure optimization, and community action for Indian cities.",
      liveIndicator: "Connected to Satellite & Ground Stations",
      offlineIndicator: "Using High-Precision Local In-Memory Cache",
      refreshButton: "Sync Live Data",
      refreshing: "Syncing Upstream Feeds...",
      citySelectorLabel: "Target City / Monitoring Station:",
      languageToggle: "हिंदी में देखें",
      quickPresets: "Quick Presets:",
    },
    dualScale: {
      title: "Dual-Scale Reality Check",
      description:
        "Contrasting India CPCB NAQI against revised May 2024 US EPA epidemiological thresholds.",
      cpcbHeader: "India CPCB National AQI",
      cpcbCategoryPrefix: "CPCB Category",
      epaHeader: "US EPA May 2024 Revised AQI",
      epaCategoryPrefix: "US EPA Category",
      satisfactoryIllusionTitle: "CRITICAL: 'SATISFACTORY ILLUSION' DETECTED",
      satisfactoryIllusionBody:
        "Indian CPCB rates this air as 'Satisfactory' (or 'Good'), but tightened international standards (US EPA 2024) classify it as 'Unhealthy for Sensitive Groups' (or Unhealthy). Asthmatic children, elders, and pregnant individuals face active respiratory inflammatory risk despite benign local labeling.",
      subIndicesTitle: "Six-Pollutant Sub-Index Breakdown",
      subIndicesDescription:
        "Individual 24-hr/8-hr pollutant sub-indices calculated per official CPCB piecewise interpolation formulas.",
      stationSkewTitle: "Local Monitoring Station Skew Check",
      microHotspotAlert:
        "MICRO-HOTSPOT DETECTED: Ground station measures significantly higher PM2.5 than the city background model. Localized tailpipe exhaust, road dust, or open biomass burning is active nearby.",
      greenBufferAlert:
        "URBAN GREEN BUFFER: Ground station measures cleaner air than the city model due to dense canopy filtration and traffic setbacks.",
      consistentStationAlert:
        "STATION CONSISTENCY: Ground station readings align closely with regional satellite and atmospheric dispersion models.",
      opticalRhAlert:
        "HIGH-HUMIDITY OPTICAL SENSOR CORRECTION ACTIVE: Relative humidity exceeds 75%. Raw nephelometer scattering adjusted for hygroscopic particle deliquescence.",
      rawVsCapped: "Capped at 500 per statutory rules (Raw extrapolated sub-index:",
    },
    diurnal: {
      title: "48-Hour Diurnal Clean-Air Window Optimizer",
      description:
        "Exploits nocturnal thermal inversion trapping and afternoon convective planetary boundary layer mixing to minimize respiratory exposure.",
      cleanestToday: "Cleanest Window (Today)",
      worstToday: "Worst Peak Window (Today)",
      cleanestTomorrow: "Cleanest Window (Tomorrow)",
      worstTomorrow: "Worst Peak Window (Tomorrow)",
      recommendedWindowTag: "RECOMMENDED EXPOSURE WINDOW",
      avoidWindowTag: "HAZARDOUS PEAK EXERTION WINDOW",
      archetypeSelectorLabel: "Household Archetype (Breathing Rate):",
      doseComparisonTitle: "Pulmonary Inhaled Dose Comparison",
      doseComparisonSubtitle:
        "Calculated mass of PM2.5 deposited in lungs comparing peak morning exertion against the shifted afternoon convective window.",
      baselineDoseLabel: "Peak Schedule Inhaled Dose:",
      shiftedDoseLabel: "Shifted Clean Window Inhaled Dose:",
      netSparedLabel: "Net Toxic Mass Spared:",
      reductionPercentageLabel: "Pulmonary Dose Reduction:",
      airVolumeInhaledLabel: "Inhaled Air Volume (120 min):",
      interactiveTimelineAria:
        "48-hour hourly air quality timeline. Use left and right arrow keys or tab to inspect hourly forecast and recommended clean windows.",
      hourBarAria: "Hour bar at {time}: PM2.5 {pm25} µg/m³. {cleanStatus}",
      nocturnalInversionNote:
        "Winter nocturnal inversions in North India compress surface pollutants into a shallow 100-meter boundary layer between 04:00 and 09:00. Solar heating between 13:00 and 16:30 expands the mixing layer to 1200+ meters, diluting surface particulate density.",
    },
    indoor: {
      title: "Indoor Single-Zone Mass Balance Shelter Audit",
      description:
        "First-principles steady-state physics modeling indoor infiltration and sizing HEPA Clean Air Delivery Rate (CADR).",
      roomDimensionsTitle: "Room Geometry & Volume Sizing",
      lengthLabel: "Length (m):",
      widthLabel: "Width (m):",
      heightLabel: "Height (m):",
      volumeLabel: "Calculated Room Volume:",
      outdoorConcentrationLabel: "Outdoor PM2.5 Concentration:",
      comparisonBarsTitle: "Steady-State Indoor PM2.5 Infiltration Regimes",
      openWindowsLabel: "Open Windows Baseline (~92% Infiltration)",
      closedNoFilterLabel: "Closed Windows Only (~81% Infiltration)",
      closedHepaLabel: "Closed Windows + Sized HEPA Purifier (~21% Infiltration)",
      targetCadrTitle: "CADR Sizing for &le; 21% Infiltration (or WHO Targets)",
      targetCadrAchieved:
        "Active filtration already satisfies the high-protection shelter target.",
      targetCadrNeeded:
        "Install a HEPA purifier delivering at least {cadr} m³/h ({cfm} CFM), providing {ach} air changes per hour.",
      combustionAuditTitle: "Acute Indoor Combustion Spike Estimator",
      combustionAuditSubtitle:
        "Discrete residential emission events and exponential decay clearance times ($t_{rec} = \\ln(10) / k_{total}$).",
      triggerSelectLabel: "Simulate Residential Combustion Event:",
      acuteSpikeLabel: "Simulated Peak Indoor Spike:",
      clearanceTimeClosed: "Natural Decay (No Purifier):",
      clearanceTimeHepa: "HEPA Purifier Clearance Time:",
      clearanceTimeFlush: "Rapid Window Flush Clearance:",
      chemicalHazardsLabel: "Dominant Chemical Hazards:",
      literatureCitationLabel: "Scientific Literature Citation:",
      safetyAdviceLabel: "Protective Clinical Protocol:",
    },
    upwind: {
      title: "Upwind Satellite Thermal Anomalies & Meteorology",
      description:
        "NASA FIRMS active agricultural fire tracking paired with local planetary boundary layer wind vectors.",
      satelliteFireCountLabel: "Active Regional Fires (±1.5° Box):",
      nearestFireDistanceLabel: "Nearest Detected Fire Distance:",
      windVectorLabel: "Current Ground Wind Vector:",
      dispersionOutlookTitle: "Regional Smoke Transport Outlook",
      alignmentUpwindAligned:
        "UPWIND ALIGNED: Ground wind direction directly aligns with regional active fire clusters. Boundary layer transport channels smoke plumes toward your coordinates.",
      alignmentCrosswind:
        "CROSSWIND / LATERAL DISPERSION: Regional smoke plumes are transported laterally relative to local wind vectors.",
      alignmentNoneDetected:
        "NO DIRECT UPWIND PLUME ALIGNMENT: Ground air mass transport is primarily dominated by local urban vehicular, industrial, and crustal sources.",
      scientificDisclaimer:
        "Satellite thermal anomaly detections identify regional biomass burning activity. Plume impact on ground-level AQI depends on atmospheric stability, nocturnal inversion trapping, and boundary layer mixing height without implying single-source deterministic causation.",
    },
    community: {
      title: "Community & Society Smog Action Hub",
      description:
        "Delhi-NCR statutory Graded Response Action Plan (GRAP) enforcement and verified neighborhood bulletins.",
      grapStageBadge: "Statutory CAQM GRAP Stage:",
      citizenMandateTitle: "Citizen Protection & Action Checklist",
      rwaMandateTitle: "RWA / Housing Society Enforcement Mandate",
      carpoolSimulatorTitle: "Neighborhood Transit & Carpool Savings Simulator",
      commuteDistanceLabel: "Round-Trip Distance (km):",
      baselineModeLabel: "Current Transport Mode:",
      chosenModeLabel: "Proposed Clean Alternative:",
      co2AvoidedLabel: "Net Carbon Emissions Avoided:",
      pm25AvoidedLabel: "Personal Toxic PM2.5 Inhalation Avoided:",
      copyAdvisoryButton: "Copy RWA / School WhatsApp Advisory",
      copiedSuccess: "Copied to Clipboard!",
      shareWhatsAppButton: "Share on WhatsApp",
      shareTelegramButton: "Share on Telegram",
      bulletinSubject: "VayuShield Official Air Quality Bulletin",
      openBurningHelpline:
        "To report illegal open waste burning or dust violations, report immediately on the 311 Citizen App or CAQM hotline 011-23701213.",
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
      disclaimer:
        "VayuShield provides environmental risk assessments based on deterministic mathematical models and public atmospheric science feeds. Consult certified healthcare providers for clinical diagnosis and acute symptom management.",
    },
  },
  hi: {
    app: {
      title: "वायुशील्ड (VayuShield)",
      subtitle: "शहरी वायु गुणवत्ता एवं स्वच्छ-हवा सुरक्षा नेविगेटर",
      tagline:
        "भारतीय शहरों के लिए सटीक पर्यावरणीय भौतिकी, दैनिक प्रदूषण अनुकूलन और नागरिक स्वास्थ्य सुरक्षा।",
      liveIndicator: "उपग्रह व निकटतम निगरानी स्टेशनों से जुड़ा",
      offlineIndicator: "उच्च-सटीक स्थानीय स्मृति (Cache) का उपयोग",
      refreshButton: "ताजा डेटा प्राप्त करें",
      refreshing: "डेटा लोड हो रहा है...",
      citySelectorLabel: "शहर / स्टेशन चयन:",
      languageToggle: "View in English",
      quickPresets: "त्वरित शहर:",
    },
    dualScale: {
      title: "द्वि-पैमाना वास्तविकता जांच (Dual-Scale Reality Check)",
      description:
        "भारतीय सीपीसीबी (CPCB) सूचकांक की अंतरराष्ट्रीय यूएस ईपीए (US EPA 2024) स्वास्थ्य मानकों से तुलना।",
      cpcbHeader: "भारत CPCB राष्ट्रीय एक्यूआई",
      cpcbCategoryPrefix: "सीपीसीबी श्रेणी",
      epaHeader: "US EPA मई 2024 संशोधित एक्यूआई",
      epaCategoryPrefix: "यूएस ईपीए श्रेणी",
      satisfactoryIllusionTitle: "सावधान: 'संतोषजनक वायु का भ्रम' (Satisfactory Illusion) सक्रिय",
      satisfactoryIllusionBody:
        "स्थानीय सीपीसीबी पैमाना इस हवा को 'संतोषजनक' या 'अच्छा' बताता है, लेकिन अंतरराष्ट्रीय स्वास्थ्य मानकों (US EPA 2024) के अनुसार यह 'संवेदनशील वर्गों के लिए अस्वास्थ्यकर' या हानिकारक है। दमा से पीड़ित बच्चों, बुजुर्गों और गर्भवती महिलाओं को सुरक्षित इनडोर वातावरण में रहना चाहिए।",
      subIndicesTitle: "छह प्रदूषकों का उप-सूचकांक (Sub-Indices)",
      subIndicesDescription:
        "सीपीसीबी के आधिकारिक फॉर्मूलों के आधार पर PM2.5, PM10, NO2, O3, SO2 और CO के उप-सूचकांक।",
      stationSkewTitle: "निकटतम जमीनी स्टेशन विचलन जांच",
      microHotspotAlert:
        "स्थानीय हॉटस्पॉट चेतावनी: जमीनी स्टेशन पर शहर के औसत से काफी अधिक प्रदूषण दर्ज हुआ है। निकट में अत्यधिक ट्रैफिक, कचरा जलना या निर्माण कार्य की धूल सक्रिय है।",
      greenBufferAlert:
        "हरित क्षेत्र (Green Buffer): घने वृक्षों व ट्रैफिक दूरी के कारण यह स्टेशन शहर के औसत से अधिक स्वच्छ हवा दर्ज कर रहा है।",
      consistentStationAlert:
        "स्टेशन अनुकूलता: जमीनी स्टेशन का डेटा क्षेत्रीय वायुमंडलीय मॉडल के साथ पूरी तरह मेल खाता है।",
      opticalRhAlert:
        "उच्च आर्द्रता ऑप्टिकल सेंसर सुधार: हवा में नमी 75% से अधिक है। जलकणों के प्रभाव को भौतिक एल्गोरिदम द्वारा निष्कासित किया गया है।",
      rawVsCapped: "नियमों के तहत 500 पर सीमित (वास्तविक गणना:",
    },
    diurnal: {
      title: "48-घंटे स्वच्छ-हवा दैनिक समय अनुकूलक (Diurnal Optimizer)",
      description:
        "रात के प्रदूषण जमाव (Inversion) और दोपहर की धूप वाली वायुमंडलीय सफाई का उपयोग करके फेफड़ों में जाने वाले विषैले कणों को कम करें।",
      cleanestToday: "आज का सबसे स्वच्छ समय",
      worstToday: "आज का सबसे गंभीर प्रदूषित समय",
      cleanestTomorrow: "कल का सबसे स्वच्छ समय",
      worstTomorrow: "कल का सबसे गंभीर प्रदूषित समय",
      recommendedWindowTag: "सुझाया गया बाहरी गतिविधि समय",
      avoidWindowTag: "अत्यधिक विषैला समय - बाहर न निकलें",
      archetypeSelectorLabel: "परिवार के सदस्य की संवेदनशीलता (श्वसन दर):",
      doseComparisonTitle: "फेफड़ों में जाने वाले PM2.5 कणों की तुलना",
      doseComparisonSubtitle:
        "सुबह की सैर बनाम दोपहर के स्वच्छतम समय में सांस लेने से फेफड़ों में जमा होने वाले प्रदूषण की सही मात्रा।",
      baselineDoseLabel: "सुबह के समय सांस में गया प्रदूषण:",
      shiftedDoseLabel: "दोपहर के समय सांस में गया प्रदूषण:",
      netSparedLabel: "फेफड़ों में जाने से बचा विषैला धुआं:",
      reductionPercentageLabel: "प्रदूषण में कुल प्रतिशत कमी:",
      airVolumeInhaledLabel: "सांस ली गई कुल हवा (120 मिनट):",
      interactiveTimelineAria:
        "48-घंटे का प्रति घंटा वायु गुणवत्ता ग्राफ। स्वच्छ खिड़कियों और प्रदूषण के स्तर को देखने के लिए तीर कुंजियों का उपयोग करें।",
      hourBarAria: "समय {time}: PM2.5 {pm25} µg/m³. {cleanStatus}",
      nocturnalInversionNote:
        "उत्तर भारत में सर्दियों में रात 04:00 से सुबह 09:00 तक धुआं जमीन से 100 मीटर की ऊंचाई पर फंस जाता है। दोपहर 13:00 से 16:30 बजे के बीच धूप से यह परत 1200+ मीटर फैलकर हवा को काफी हद तक पतला व स्वच्छ कर देती है।",
    },
    indoor: {
      title: "इनडोर शेल्टर एवं घरेलू दहन सुरक्षा ऑडिट",
      description:
        "कमरे के आयतन के अनुसार इनडोर प्रदूषण का सही भौतिक मॉडल और हेपा (HEPA) एयर प्यूरीफायर की आवश्यक क्षमता।",
      roomDimensionsTitle: "कमरे का आकार व वायु आयतन",
      lengthLabel: "लंबाई (मीटर):",
      widthLabel: "चौड़ाई (मीटर):",
      heightLabel: "ऊंचाई (मीटर):",
      volumeLabel: "कमरे का कुल आयतन:",
      outdoorConcentrationLabel: "बाहरी PM2.5 प्रदूषण:",
      comparisonBarsTitle: "इनडोर PM2.5 प्रदूषण की स्थिति",
      openWindowsLabel: "खुली खिड़कियां (~92% बाहरी धुआं अंदर)",
      closedNoFilterLabel: "केवल खिड़कियां बंद (~81% धुआं अंदर)",
      closedHepaLabel: "खिड़कियां बंद + सही आकार का HEPA प्यूरीफायर (~21% धुआं)",
      targetCadrTitle: "21% से कम इनडोर प्रदूषण के लिए आवश्यक CADR क्षमता",
      targetCadrAchieved: "सक्रिय प्यूरीफायर पहले से ही सुरक्षित शेल्टर स्तर प्रदान कर रहा है।",
      targetCadrNeeded:
        "कमरे में कम से कम {cadr} m³/h ({cfm} CFM) CADR क्षमता वाला HEPA प्यूरीफायर लगाएं, जो प्रति घंटे {ach} बार हवा बदले।",
      combustionAuditTitle: "घरेलू धुएं (Combustion) का खतरा व सफाई का समय",
      combustionAuditSubtitle:
        "घर के अंदर होने वाले discrete उत्सर्जन और हवा साफ होने में लगने वाला समय ($t_{rec} = \\ln(10) / k_{total}$).",
      triggerSelectLabel: "घर के अंदर धुएं का स्रोत चुनें:",
      acuteSpikeLabel: "कमरे में अचानक बढ़ा प्रदूषण:",
      clearanceTimeClosed: "बिना प्यूरीफायर हवा साफ होने का समय:",
      clearanceTimeHepa: "HEPA प्यूरीफायर से हवा साफ होने का समय:",
      clearanceTimeFlush: "खिड़कियां खोलकर तेज वेंटिलेशन समय:",
      chemicalHazardsLabel: "उत्सर्जित विषैले रासायनिक तत्व:",
      literatureCitationLabel: "वैज्ञानिक शोध संदर्भ:",
      safetyAdviceLabel: "सुरक्षा निर्देश:",
    },
    upwind: {
      title: "उपग्रह से पराली/आग की निगरानी एवं मौसम विज्ञान",
      description:
        "नासा (NASA FIRMS) उपग्रह द्वारा क्षेत्रीय आग की पहचान और स्थानीय हवा की दिशा का विश्लेषण।",
      satelliteFireCountLabel: "क्षेत्रीय सक्रिय आग के स्थान (±1.5° क्षेत्र):",
      nearestFireDistanceLabel: "सबसे निकटतम आग की दूरी:",
      windVectorLabel: "वर्तमान जमीनी हवा की दिशा व गति:",
      dispersionOutlookTitle: "धुआं परिवहन और फैलाव की स्थिति",
      alignmentUpwindAligned:
        "सीधी हवा का प्रभाव (Upwind Aligned): हवा की दिशा सीधे तौर पर पराली/आग वाले क्षेत्रों से आपकी ओर आ रही है। धुआं सीधे तौर पर आपके क्षेत्र में प्रवेश कर रहा है।",
      alignmentCrosswind:
        "तिरछी हवा (Crosswind): धुआं आपके क्षेत्र के अगल-बगल से होकर निकल रहा है।",
      alignmentNoneDetected:
        "कोई सीधा धुआं प्रवाह नहीं: वर्तमान प्रदूषण मुख्य रूप से स्थानीय वाहनों, उद्योगों और सड़क की धूल के कारण है।",
      scientificDisclaimer:
        "उपग्रह डेटा कृषि व बायोमास की आग दिखाता है। इसका स्थानीय हवा पर असर वायुमंडलीय ऊंचाई और फैलाव पर निर्भर करता है, इसे केवल एक ही कारण नहीं माना जा सकता।",
    },
    community: {
      title: "सामुदायिक व आरडब्ल्यूए (RWA) ग्रैप एक्शन हब",
      description:
        "दिल्ली-एनसीआर में लागू वैधानिक ग्रैप (GRAP) नियम, नागरिक कर्तव्य और साझा व्हाट्सएप परामर्श।",
      grapStageBadge: "लागू वैधानिक ग्रैप (GRAP) चरण:",
      citizenMandateTitle: "नागरिक स्वास्थ्य सुरक्षा चेकलिस्ट",
      rwaMandateTitle: "सोसायटी व आरडब्ल्यूए के लिए वैधानिक नियम",
      carpoolSimulatorTitle: "पड़ोस कारपूल व मेट्रो प्रदूषण बचत सिम्युलेटर",
      commuteDistanceLabel: "आने-जाने की दूरी (किमी):",
      baselineModeLabel: "वर्तमान यात्रा साधन:",
      chosenModeLabel: "प्रदूषण-मुक्त विकल्प:",
      co2AvoidedLabel: "कार्बन उत्सर्जन में कुल बचत:",
      pm25AvoidedLabel: "फेफड़ों में जाने से बचा जहरीला PM2.5:",
      copyAdvisoryButton: "RWA / स्कूल व्हाट्सएप परामर्श कॉपी करें",
      copiedSuccess: "कॉपी हो गया!",
      shareWhatsAppButton: "व्हाट्सएप पर शेयर करें",
      shareTelegramButton: "टेलीग्राम पर शेयर करें",
      bulletinSubject: "वायुशील्ड (VayuShield) आधिकारिक वायु गुणवत्ता बुलेटिन",
      openBurningHelpline:
        "कचरा जलाने या अवैध धूल निर्माण की शिकायत 311 ऐप या CAQM हेल्पलाइन 011-23701213 पर तुरंत दर्ज करें।",
    },
    attributions: {
      title: "डेटा स्रोत व वैज्ञानिक आभार (Data Attributions)",
      camsCredit:
        "वायु गुणवत्ता पूर्वानुमान डेटा ओपन-मेटियो (Open-Meteo) व यूरोपीय संघ के कॉपरनिकस (CAMS) द्वारा (लाइसेंस CC BY 4.0)।",
      waqiCredit:
        "जमीनी स्टेशन डेटा वर्ल्ड एयर क्वालिटी इंडेक्स प्रोजेक्ट (WAQI/AQICN), केंद्रीय प्रदूषण नियंत्रण बोर्ड (CPCB) व राज्य प्रदूषण नियंत्रण बोर्डों द्वारा।",
      openaqCredit:
        "ओपनएक्यू (OpenAQ v3 API) वैश्विक वायु गुणवत्ता समुदाय द्वारा।",
      nasaFirmsCredit:
        "उपग्रह थर्मल और सक्रिय आग डेटा नासा फर्म्स (NASA FIRMS / EOSDIS, NASA Earthdata) द्वारा।",
      googleMapsCredit:
        "गूगल मैप्स प्लेटफॉर्म एयर क्वालिटी एपीआई (Google Maps Platform Air Quality API) के सहयोग से।",
      disclaimer:
        "वायुशील्ड भौतिक गणितीय मॉडल और सार्वजनिक वायुमंडलीय डेटा पर आधारित जोखिम मूल्यांकन प्रदान करता है। किसी भी गंभीर स्वास्थ्य लक्षण में प्रमाणित डॉक्टर से सलाह लें।",
    },
  },
};
