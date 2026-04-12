export const INTERNAL_PREFIX = "/_howl";
export const DEV_ERROR_OVERLAY_URL: string = `${INTERNAL_PREFIX}/error_overlay`;
export const ALIVE_URL: string = `${INTERNAL_PREFIX}/alive`;
export const PARTIAL_SEARCH_PARAM = "howl-partial";

export const SECOND = 1000;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const WEEK = DAY * 7;

export const ASSET_CACHE_BUST_KEY = "__howl_c";
export const UPDATE_INTERVAL = DAY;
export const TEST_FILE_PATTERN = /[._]test\.(?:[tj]sx?|[mc][tj]s)$/;
