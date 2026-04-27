/** URL prefix used for all framework-internal endpoints. */
export const INTERNAL_PREFIX = "/_howl";
/** URL of the development error overlay endpoint. */
export const DEV_ERROR_OVERLAY_URL: string = `${INTERNAL_PREFIX}/error_overlay`;
/** URL of the live-reload heartbeat endpoint. */
export const ALIVE_URL: string = `${INTERNAL_PREFIX}/alive`;
/** Search-param flag indicating the current request is a Howl partial render. */
export const PARTIAL_SEARCH_PARAM = "howl-partial";

/** One second expressed in milliseconds. */
export const SECOND = 1000;
/** One minute expressed in milliseconds. */
export const MINUTE = SECOND * 60;
/** One hour expressed in milliseconds. */
export const HOUR = MINUTE * 60;
/** One day expressed in milliseconds. */
export const DAY = HOUR * 24;
/** One week expressed in milliseconds. */
export const WEEK = DAY * 7;

/** Query-string key used to bust caches for hashed asset URLs. */
export const ASSET_CACHE_BUST_KEY = "__howl_c";
/** Default interval between dev-mode update checks. */
export const UPDATE_INTERVAL: number = DAY;
/** RegExp used by the FS crawler to skip test files. */
export const TEST_FILE_PATTERN: RegExp = /[._]test\.(?:[tj]sx?|[mc][tj]s)$/;
