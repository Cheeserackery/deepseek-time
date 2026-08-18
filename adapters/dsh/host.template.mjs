/**
 * Host-side entry for the DeepSeek Time adapter.
 *
 * DSH loads every profile bundle as a host module before injecting its Web
 * client module. This no-op entry makes that import safe for this client-only
 * package.
 */
export const name = 'deepseek-time'
export const inject = []
export function apply() {}
