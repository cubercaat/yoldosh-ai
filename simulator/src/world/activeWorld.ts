/** Hozir qaysi dunyo o'ynalyapti: 'city' (cheksiz shahar) yoki 'autodrom' (haydash maktabi maydoni) yoki 'exam' (imtihon avtodromi: marshrut). DRIVE bosilganda o'rnatiladi. */
export type WorldKind = 'city' | 'autodrom' | 'exam'
/** tashkent: kind='city' bo'lib qoladi (HUD/qoidalar shaharniki), faqat dunyo geometriyasi Toshkent (OSM) */
export type UiWorld = WorldKind | 'tashkent'
export const aw: { kind: WorldKind; tashkent: boolean } = { kind: 'city', tashkent: false }
