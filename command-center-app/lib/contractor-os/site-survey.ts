export const SURVEY_DISCIPLINES = [
  "CCTV",
  "NETWORK",
  "ACCESS_CONTROL",
  "FIRE_ALARM",
  "AUDIO_AV",
  "RADIO_WIRELESS",
] as const;

export type SurveyDiscipline = (typeof SURVEY_DISCIPLINES)[number];

export type SurveyChecklistItem = {
  key: string;
  label: string;
  required: boolean;
  helpText?: string;
};

export type SurveyChecklistSection = {
  key: string;
  title: string;
  disciplines?: SurveyDiscipline[];
  items: SurveyChecklistItem[];
};

const common: SurveyChecklistSection[] = [
  { key: "arrival", title: "Arrival & site information", items: [
    { key: "arrival.contact", label: "Confirm onsite customer/contact", required: true },
    { key: "arrival.scope", label: "Confirm requested scope and work areas", required: true },
    { key: "arrival.access", label: "Document access restrictions, hours and escorts", required: false },
  ]},
  { key: "walkthrough", title: "Building walkthrough", items: [
    { key: "walkthrough.areas", label: "Identify buildings, floors, rooms and work areas", required: true },
    { key: "walkthrough.pathways", label: "Document cable pathways, penetrations and obstructions", required: true },
    { key: "walkthrough.lifts", label: "Record ceiling heights and lift/ladder requirements", required: false },
    { key: "walkthrough.power", label: "Document available power and UPS requirements", required: false },
  ]},
];

const disciplineSections: Record<SurveyDiscipline, SurveyChecklistSection[]> = {
  CCTV: [{ key: "cctv", title: "CCTV survey", disciplines: ["CCTV"], items: [
    { key: "cctv.existing", label: "Document existing cameras, recorder and monitoring locations", required: true },
    { key: "cctv.coverage", label: "Capture each proposed camera location and required field of view", required: true },
    { key: "cctv.mounting", label: "Record mounting surface and height for each camera", required: true },
    { key: "cctv.recording", label: "Confirm NVR/DVR, retention and monitor requirements", required: false },
    { key: "cctv.network", label: "Identify PoE switch, rack and network handoff", required: true },
  ]}],
  NETWORK: [{ key: "network", title: "Network / Wi-Fi survey", disciplines: ["NETWORK"], items: [
    { key: "network.demarc", label: "Locate ISP demarc, router/firewall and WAN handoff", required: true },
    { key: "network.idf", label: "Document MDF/IDF racks, patch panels and switches", required: true },
    { key: "network.drops", label: "Mark proposed data drops and AP locations", required: true },
    { key: "network.fiber", label: "Document copper/fiber backbone and available pathways", required: false },
    { key: "network.poe", label: "Record PoE requirements and available switch capacity", required: false },
  ]}],
  ACCESS_CONTROL: [{ key: "access", title: "Access control survey", disciplines: ["ACCESS_CONTROL"], items: [
    { key: "access.doors", label: "Photograph and identify every controlled door", required: true },
    { key: "access.hardware", label: "Record door/frame material and existing lock hardware", required: true },
    { key: "access.devices", label: "Mark reader, REX, contact, lock and intercom locations", required: true },
    { key: "access.controller", label: "Identify controller and power-supply location", required: true },
    { key: "access.egress", label: "Document existing egress/life-safety conditions for design review", required: true },
  ]}],
  FIRE_ALARM: [{ key: "fire", title: "Fire alarm existing-condition survey", disciplines: ["FIRE_ALARM"], items: [
    { key: "fire.panel", label: "Document existing panel, annunciator and available documentation", required: true },
    { key: "fire.devices", label: "Capture existing/proposed device locations and visible conditions", required: true },
    { key: "fire.pathways", label: "Document pathways and accessible wiring conditions", required: true },
    { key: "fire.constraints", label: "Record site/AHJ/permit information supplied by the customer", required: false },
    { key: "fire.review", label: "Flag life-safety/code decisions for qualified design/AHJ review", required: true },
  ]}],
  AUDIO_AV: [{ key: "audio", title: "Audio / AV survey", disciplines: ["AUDIO_AV"], items: [
    { key: "audio.areas", label: "Document coverage/listening/viewing areas", required: true },
    { key: "audio.devices", label: "Mark speakers, displays, microphones and control points", required: true },
    { key: "audio.rack", label: "Identify amplifier/AV rack and power locations", required: true },
    { key: "audio.paths", label: "Document signal and speaker cable pathways", required: false },
  ]}],
  RADIO_WIRELESS: [{ key: "radio", title: "Radio / wireless survey", disciplines: ["RADIO_WIRELESS"], items: [
    { key: "radio.mount", label: "Capture proposed radio/antenna mounting location", required: true },
    { key: "radio.signal", label: "Record carrier/signal readings and line-of-sight observations", required: true },
    { key: "radio.power", label: "Document power/PoE and grounding conditions", required: true },
    { key: "radio.handoff", label: "Document WAN/SD-WAN handoff and equipment location", required: true },
  ]}],
};

export function checklistForDisciplines(disciplines: SurveyDiscipline[]) {
  const selected = new Set(disciplines);
  return [...common, ...SURVEY_DISCIPLINES.filter((d) => selected.has(d)).flatMap((d) => disciplineSections[d])];
}

export function parseSurveyDisciplines(values: string[]): SurveyDiscipline[] {
  const unique = [...new Set(values)];
  const parsed = unique.filter((value): value is SurveyDiscipline =>
    SURVEY_DISCIPLINES.includes(value as SurveyDiscipline),
  );
  if (!parsed.length) throw new Error("Select at least one survey discipline");
  return parsed;
}


export const SURVEY_POINT_TYPES: Record<SurveyDiscipline, readonly string[]> = {
  CCTV: ["CAMERA","MONITOR","NVR_DVR","SWITCH","RACK","JUNCTION_BOX"],
  NETWORK: ["ACCESS_POINT","DATA_DROP","SWITCH","ROUTER_FIREWALL","RACK","MDF_IDF"],
  ACCESS_CONTROL: ["DOOR","READER","LOCK","REX","DOOR_CONTACT","CONTROLLER","POWER_SUPPLY","INTERCOM"],
  FIRE_ALARM: ["SMOKE_DETECTOR","HEAT_DETECTOR","PULL_STATION","HORN_STROBE","STROBE","SPEAKER_STROBE","FACP","ANNUNCIATOR","MODULE"],
  AUDIO_AV: ["SPEAKER","DISPLAY","MICROPHONE","AMPLIFIER","AV_RACK","CONTROL_PANEL"],
  RADIO_WIRELESS: ["RADIO","ANTENNA","POE_INJECTOR","SD_WAN","GROUNDING","WAN_HANDOFF"],
};

export function pointTypesForDiscipline(discipline:SurveyDiscipline){return SURVEY_POINT_TYPES[discipline];}
