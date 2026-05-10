import type { CandidateFilters, CandidateStatus, PotholeCandidate, Severity } from "../domain/candidates";

interface ServiceRequestTarget {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  firstReportedAt: string;
  lastReportedAt: string;
  reportCount: number;
  ward: string;
  serviceRequestType: string;
}

export const severityOptions: Severity[] = ["low", "medium", "high"];

export const statusOptions: CandidateStatus[] = [
  "monitoring",
  "verified",
  "assigned",
  "repaired",
  "recurring",
];

export const defaultFilters: CandidateFilters = {
  severities: ["low", "medium", "high"],
  statuses: ["monitoring", "verified", "assigned", "recurring"],
  minConfidence: 0,
  lastDetectedWithinHours: "all",
};

const serviceRequestTargets: ServiceRequestTarget[] = [
  {
    id: "sr2026-m1e-postal-area",
    address: "M1E postal area",
    latitude: 43.7675,
    longitude: -79.1854,
    firstReportedAt: "2026-01-02T09:54:24Z",
    lastReportedAt: "2026-01-02T09:54:24Z",
    reportCount: 1,
    ward: "Scarborough-Rouge Park (25)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-victoria-pr-s-401-c-w-ramp-and-victoria-park-ave",
    address: "Victoria Pr S 401 C W Ramp & Victoria Park Ave",
    latitude: 43.7625,
    longitude: -79.3151,
    firstReportedAt: "2026-01-02T10:32:32Z",
    lastReportedAt: "2026-01-02T10:32:32Z",
    reportCount: 1,
    ward: "Scarborough-Agincourt (22)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-highway-27-s-and-steeles-ave-w",
    address: "Highway 27 S & Steeles Ave W",
    latitude: 43.7539,
    longitude: -79.6263,
    firstReportedAt: "2026-01-02T11:08:09Z",
    lastReportedAt: "2026-01-02T11:08:09Z",
    reportCount: 1,
    ward: "Etobicoke North (01)",
    serviceRequestType: "Pothole on Expressway",
  },
  {
    id: "sr2026-eastern-ave-and-c-n-r",
    address: "Eastern Ave & C N R",
    latitude: 43.658,
    longitude: -79.341,
    firstReportedAt: "2026-01-02T20:41:18Z",
    lastReportedAt: "2026-01-02T20:41:18Z",
    reportCount: 1,
    ward: "Toronto-Danforth (14)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-don-mills-rd-and-overlea-blvd",
    address: "Don Mills Rd & Overlea Blvd",
    latitude: 43.705,
    longitude: -79.3492,
    firstReportedAt: "2026-01-03T19:23:45Z",
    lastReportedAt: "2026-01-03T19:23:45Z",
    reportCount: 1,
    ward: "Don Valley East (16)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-bathurst-st-and-dewlane-dr",
    address: "Bathurst St & Dewlane Dr",
    latitude: 43.7725,
    longitude: -79.4439,
    firstReportedAt: "2026-01-04T16:31:22Z",
    lastReportedAt: "2026-01-04T16:31:22Z",
    reportCount: 1,
    ward: "York Centre (06)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-humberwood-blvd-and-topbank-dr",
    address: "Humberwood Blvd & Topbank Dr",
    latitude: 43.7224,
    longitude: -79.618,
    firstReportedAt: "2026-01-04T23:08:58Z",
    lastReportedAt: "2026-01-04T23:08:58Z",
    reportCount: 1,
    ward: "Etobicoke North (01)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m4p-postal-area",
    address: "M4P postal area",
    latitude: 43.7117,
    longitude: -79.3904,
    firstReportedAt: "2026-01-05T12:30:24Z",
    lastReportedAt: "2026-01-29T09:55:35Z",
    reportCount: 2,
    ward: "Toronto-St. Paul's (12)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-lake-shore-blvd-w-and-humber-river",
    address: "Lake Shore Blvd W & Humber River",
    latitude: 43.6339,
    longitude: -79.478,
    firstReportedAt: "2026-01-06T13:11:20Z",
    lastReportedAt: "2026-01-06T13:11:20Z",
    reportCount: 1,
    ward: "Parkdale-High Park (04)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-nassau-st-and-bathurst-st",
    address: "Nassau St & Bathurst St",
    latitude: 43.655,
    longitude: -79.4052,
    firstReportedAt: "2026-01-07T06:39:22Z",
    lastReportedAt: "2026-01-07T06:39:22Z",
    reportCount: 1,
    ward: "University-Rosedale (11)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m5c-postal-area",
    address: "M5C postal area",
    latitude: 43.6502,
    longitude: -79.3745,
    firstReportedAt: "2026-01-08T13:54:42Z",
    lastReportedAt: "2026-01-08T13:54:42Z",
    reportCount: 1,
    ward: "Toronto Centre (13)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-eglinton-ave-e-and-redpath-ave",
    address: "Eglinton Ave E & Redpath Ave",
    latitude: 43.7074,
    longitude: -79.3931,
    firstReportedAt: "2026-01-09T22:04:33Z",
    lastReportedAt: "2026-01-14T11:57:44Z",
    reportCount: 2,
    ward: "Toronto-St. Paul's (12)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-bathurst-st-and-dewbourne-ave",
    address: "Bathurst St & Dewbourne Ave",
    latitude: 43.6995,
    longitude: -79.4285,
    firstReportedAt: "2026-01-10T12:53:12Z",
    lastReportedAt: "2026-01-10T12:53:12Z",
    reportCount: 1,
    ward: "Toronto-St. Paul's (12)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m2j-postal-area",
    address: "M2J postal area",
    latitude: 43.778,
    longitude: -79.3475,
    firstReportedAt: "2026-01-10T13:37:51Z",
    lastReportedAt: "2026-01-10T13:37:51Z",
    reportCount: 1,
    ward: "Don Valley North (17)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-redpath-ave-and-broadway-ave",
    address: "Redpath Ave & Broadway Ave",
    latitude: 43.7102,
    longitude: -79.3922,
    firstReportedAt: "2026-01-10T13:46:21Z",
    lastReportedAt: "2026-01-10T13:46:21Z",
    reportCount: 1,
    ward: "Toronto-St. Paul's (12)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-401-x-w-409-w-and-belfield-rd",
    address: "401 X W 409 W & Belfield Rd",
    latitude: 43.6958,
    longitude: -79.5765,
    firstReportedAt: "2026-01-10T18:21:57Z",
    lastReportedAt: "2026-01-10T18:21:57Z",
    reportCount: 1,
    ward: "Etobicoke North (01)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-highway-27-n-and-royalcrest-rd",
    address: "Highway 27 N & Royalcrest Rd",
    latitude: 43.7378,
    longitude: -79.6278,
    firstReportedAt: "2026-01-11T03:33:12Z",
    lastReportedAt: "2026-01-11T03:33:12Z",
    reportCount: 1,
    ward: "Etobicoke North (01)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-bathurst-st-and-york-downs-dr",
    address: "Bathurst St & York Downs Dr",
    latitude: 43.7535,
    longitude: -79.4391,
    firstReportedAt: "2026-01-11T12:58:44Z",
    lastReportedAt: "2026-01-11T12:58:44Z",
    reportCount: 1,
    ward: "York Centre (06)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-don-river-w-branch-and-don-river-blvd",
    address: "Don River W Branch & Don River Blvd",
    latitude: 43.759,
    longitude: -79.428,
    firstReportedAt: "2026-01-12T11:12:15Z",
    lastReportedAt: "2026-01-12T11:12:15Z",
    reportCount: 1,
    ward: "York Centre (06)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-finch-ave-w-and-tangiers-rd",
    address: "Finch Ave W & Tangiers Rd",
    latitude: 43.764,
    longitude: -79.489,
    firstReportedAt: "2026-01-12T12:18:57Z",
    lastReportedAt: "2026-01-12T12:18:57Z",
    reportCount: 1,
    ward: "York Centre (06)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m1w-postal-area",
    address: "M1W postal area",
    latitude: 43.8,
    longitude: -79.322,
    firstReportedAt: "2026-01-12T13:55:48Z",
    lastReportedAt: "2026-01-12T13:55:48Z",
    reportCount: 1,
    ward: "Scarborough-Agincourt (22)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-dundas-st-e-and-mutual-st",
    address: "Dundas St E & Mutual St",
    latitude: 43.6575,
    longitude: -79.3766,
    firstReportedAt: "2026-01-12T17:09:46Z",
    lastReportedAt: "2026-01-12T17:09:46Z",
    reportCount: 1,
    ward: "Toronto Centre (13)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m5j-postal-area",
    address: "M5J postal area",
    latitude: 43.6425,
    longitude: -79.3804,
    firstReportedAt: "2026-01-13T14:08:03Z",
    lastReportedAt: "2026-01-13T14:08:03Z",
    reportCount: 1,
    ward: "Spadina-Fort York (10)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m3c-postal-area",
    address: "M3C postal area",
    latitude: 43.7272,
    longitude: -79.3384,
    firstReportedAt: "2026-01-13T14:22:44Z",
    lastReportedAt: "2026-01-13T14:22:44Z",
    reportCount: 1,
    ward: "Don Valley East (16)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m9l-postal-area",
    address: "M9L postal area",
    latitude: 43.7586,
    longitude: -79.5675,
    firstReportedAt: "2026-01-13T17:33:40Z",
    lastReportedAt: "2026-01-13T17:33:40Z",
    reportCount: 1,
    ward: "Humber River-Black Creek (07)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m4c-postal-area",
    address: "M4C postal area",
    latitude: 43.695,
    longitude: -79.316,
    firstReportedAt: "2026-01-14T12:08:35Z",
    lastReportedAt: "2026-01-14T12:08:35Z",
    reportCount: 1,
    ward: "Beaches-East York (19)",
    serviceRequestType: "Bike Lane Pothole",
  },
  {
    id: "sr2026-danforth-ave-and-dawes-rd",
    address: "Danforth Ave & Dawes Rd",
    latitude: 43.6897,
    longitude: -79.2989,
    firstReportedAt: "2026-01-14T12:34:05Z",
    lastReportedAt: "2026-01-14T12:34:05Z",
    reportCount: 1,
    ward: "Beaches-East York (19)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m5v-postal-area",
    address: "M5V postal area",
    latitude: 43.6453,
    longitude: -79.3958,
    firstReportedAt: "2026-01-14T17:43:44Z",
    lastReportedAt: "2026-01-14T17:48:31Z",
    reportCount: 2,
    ward: "Spadina-Fort York (10)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-nightstar-rd-and-morningside-ave",
    address: "Nightstar Rd & Morningside Ave",
    latitude: 43.8238,
    longitude: -79.1872,
    firstReportedAt: "2026-01-14T19:48:27Z",
    lastReportedAt: "2026-01-23T20:08:57Z",
    reportCount: 2,
    ward: "Scarborough-Rouge Park (25)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m9m-postal-area",
    address: "M9M postal area",
    latitude: 43.736,
    longitude: -79.5407,
    firstReportedAt: "2026-01-14T19:55:43Z",
    lastReportedAt: "2026-01-14T19:55:43Z",
    reportCount: 1,
    ward: "Humber River-Black Creek (07)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-balmoral-ave-and-poplar-plains-rd",
    address: "Balmoral Ave & Poplar Plains Rd",
    latitude: 43.6857,
    longitude: -79.3997,
    firstReportedAt: "2026-01-17T14:48:35Z",
    lastReportedAt: "2026-01-17T14:48:35Z",
    reportCount: 1,
    ward: "Toronto-St. Paul's (12)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-adelaide-st-e-and-parliament-st",
    address: "Adelaide St E & Parliament St",
    latitude: 43.6513,
    longitude: -79.3619,
    firstReportedAt: "2026-01-17T14:51:48Z",
    lastReportedAt: "2026-01-17T14:51:48Z",
    reportCount: 1,
    ward: "Toronto Centre (13)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m1s-postal-area",
    address: "M1S postal area",
    latitude: 43.7942,
    longitude: -79.267,
    firstReportedAt: "2026-01-17T15:01:58Z",
    lastReportedAt: "2026-01-17T15:01:58Z",
    reportCount: 1,
    ward: "Scarborough North (23)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-eastwood-rd-and-gerrard-st-e",
    address: "Eastwood Rd & Gerrard St E",
    latitude: 43.6714,
    longitude: -79.3219,
    firstReportedAt: "2026-01-17T16:16:32Z",
    lastReportedAt: "2026-01-17T16:16:32Z",
    reportCount: 1,
    ward: "Toronto-Danforth (14)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m6l-postal-area",
    address: "M6L postal area",
    latitude: 43.712,
    longitude: -79.481,
    firstReportedAt: "2026-01-17T16:40:21Z",
    lastReportedAt: "2026-01-18T16:32:48Z",
    reportCount: 2,
    ward: "York South-Weston (05)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-m3h-postal-area",
    address: "M3H postal area",
    latitude: 43.7539,
    longitude: -79.4495,
    firstReportedAt: "2026-01-19T00:10:08Z",
    lastReportedAt: "2026-01-19T00:10:08Z",
    reportCount: 1,
    ward: "York Centre (06)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-dufferin-st-and-st-clair-ave-w",
    address: "Dufferin St & St Clair Ave W",
    latitude: 43.6769,
    longitude: -79.4437,
    firstReportedAt: "2026-01-20T10:24:28Z",
    lastReportedAt: "2026-01-20T10:24:28Z",
    reportCount: 1,
    ward: "Davenport (09)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-st-clair-ave-w-and-vaughan-rd",
    address: "St Clair Ave W & Vaughan Rd",
    latitude: 43.684,
    longitude: -79.4145,
    firstReportedAt: "2026-01-20T11:13:37Z",
    lastReportedAt: "2026-01-20T11:13:37Z",
    reportCount: 1,
    ward: "Toronto-St. Paul's (12)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-bathurst-st-and-kenton-dr",
    address: "Bathurst St & Kenton Dr",
    latitude: 43.787,
    longitude: -79.4465,
    firstReportedAt: "2026-01-21T10:54:44Z",
    lastReportedAt: "2026-01-21T10:54:44Z",
    reportCount: 1,
    ward: "York Centre (06)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-lawrence-ave-e-and-yonge-st",
    address: "Lawrence Ave E & Yonge St",
    latitude: 43.7252,
    longitude: -79.4022,
    firstReportedAt: "2026-01-22T08:25:53Z",
    lastReportedAt: "2026-01-22T08:25:53Z",
    reportCount: 1,
    ward: "Eglinton-Lawrence (08)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-finch-ave-w-and-bathurst-st",
    address: "Finch Ave W & Bathurst St",
    latitude: 43.7807,
    longitude: -79.4446,
    firstReportedAt: "2026-01-22T13:50:46Z",
    lastReportedAt: "2026-01-22T13:50:46Z",
    reportCount: 1,
    ward: "York Centre (06)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-civic-rd-and-warden-ave",
    address: "Civic Rd & Warden Ave",
    latitude: 43.7113,
    longitude: -79.2823,
    firstReportedAt: "2026-01-22T14:15:34Z",
    lastReportedAt: "2026-01-22T14:15:34Z",
    reportCount: 1,
    ward: "Scarborough Southwest (20)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-montgomery-ave-and-broadway-ave",
    address: "Montgomery Ave & Broadway Ave",
    latitude: 43.7088,
    longitude: -79.3972,
    firstReportedAt: "2026-01-23T09:34:23Z",
    lastReportedAt: "2026-01-23T09:34:23Z",
    reportCount: 1,
    ward: "Eglinton-Lawrence (08)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-dufferin-st-and-eglinton-ave-w",
    address: "Dufferin St & Eglinton Ave W",
    latitude: 43.695,
    longitude: -79.45,
    firstReportedAt: "2026-01-23T20:58:49Z",
    lastReportedAt: "2026-01-23T20:58:49Z",
    reportCount: 1,
    ward: "Davenport (09)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
  {
    id: "sr2026-steeles-ave-w-and-bathurst-st",
    address: "Steeles Ave W & Bathurst St",
    latitude: 43.793,
    longitude: -79.4442,
    firstReportedAt: "2026-01-24T09:51:39Z",
    lastReportedAt: "2026-01-24T09:51:39Z",
    reportCount: 1,
    ward: "Willowdale (18)",
    serviceRequestType: "Road Pothole / Road Damage",
  },
];

export const demoCandidates: PotholeCandidate[] = serviceRequestTargets.map(toDemoCandidate);

function toDemoCandidate(target: ServiceRequestTarget, index: number): PotholeCandidate {
  const uniqueSourceCount = sourceCountFor(target, index);
  const eventCount = uniqueSourceCount * eventsPerSourceFor(target, index);
  const averageImpactMagnitude = averageImpactMagnitudeFor(target, index);
  const peakImpactMagnitude = round1(averageImpactMagnitude + 1.1 + target.reportCount * 0.2);
  const confidenceScore = confidenceScoreFor(target, index, uniqueSourceCount);
  const severity = severityFor(averageImpactMagnitude, confidenceScore);

  return {
    id: target.id,
    address: target.address,
    latitude: target.latitude,
    longitude: target.longitude,
    confidenceScore,
    severity,
    heatRadiusMeters: Math.round(14 + confidenceScore * 0.22 + Math.min(eventCount, 20) * 0.5),
    heatIntensity: round2(Math.min(1, 0.24 + confidenceScore / 140 + severityIntensityBonus(severity))),
    uniqueSourceCount,
    eventCount,
    averageImpactMagnitude,
    peakImpactMagnitude,
    firstDetectedAt: target.firstReportedAt,
    lastDetectedAt: target.lastReportedAt,
    status: "monitoring",
  };
}

function sourceCountFor(target: ServiceRequestTarget, index: number) {
  return (
    2 +
    target.reportCount +
    (index % 4) +
    (target.serviceRequestType === "Pothole on Expressway" ? 2 : 0)
  );
}

function eventsPerSourceFor(target: ServiceRequestTarget, index: number) {
  return target.reportCount > 1 || index % 3 === 0 ? 2 : 1;
}

function averageImpactMagnitudeFor(target: ServiceRequestTarget, index: number) {
  const requestTypeAdjustment =
    target.serviceRequestType === "Pothole on Expressway"
      ? 1.8
      : target.serviceRequestType === "Bike Lane Pothole"
        ? -0.5
        : 0;

  return round1(Math.min(9.4, 5.1 + (index % 5) * 0.45 + target.reportCount * 0.35 + requestTypeAdjustment));
}

function confidenceScoreFor(target: ServiceRequestTarget, index: number, uniqueSourceCount: number) {
  const expresswayBonus = target.serviceRequestType === "Pothole on Expressway" ? 8 : 0;
  const repeatedReportBonus = (target.reportCount - 1) * 8;

  return clampScore(48 + uniqueSourceCount * 5 + (index % 5) * 2 + repeatedReportBonus + expresswayBonus);
}

function severityFor(averageImpactMagnitude: number, confidenceScore: number): Severity {
  if (averageImpactMagnitude >= 7.2 && confidenceScore >= 70) {
    return "high";
  }

  if (averageImpactMagnitude >= 5.6 || confidenceScore >= 58) {
    return "medium";
  }

  return "low";
}

function severityIntensityBonus(severity: Severity) {
  if (severity === "high") {
    return 0.12;
  }

  if (severity === "medium") {
    return 0.06;
  }

  return 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
