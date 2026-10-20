/** Hozir qaysi dunyo o'ynalyapti: 'city' (cheksiz shahar) yoki 'autodrom' (haydash maktabi maydoni) yoki 'exam' (imtihon avtodromi: marshrut). DRIVE bosilganda o'rnatiladi. */
export type WorldKind = 'city' | 'autodrom' | 'exam'
export const aw: { kind: WorldKind } = { kind: 'city' }
