// Build id for the generated Obsidian theme.css — what the owner reads on the
// phone (Style Settings → About Artificer) to tell one dogfood install from the
// next. The release version alone cannot: feature branches and post-release
// main stay at the released version (stamp-at-merge), and Obsidian Sync
// delivers asynchronously, so "which build is on this device?" needs an id that
// changes with the content.

import { createHash } from 'node:crypto';

export const BUILD_PLACEHOLDER = '{{ARTIFICER_BUILD}}';
const ID_LENGTH = 8;
const SEMVER = /^\d+\.\d+\.\d+$/;

/** First 8 hex of sha256 over the unstamped CSS — deterministic, so an unchanged build keeps its id. */
export function buildIdOf(css) {
  return createHash('sha256').update(css).digest('hex').slice(0, ID_LENGTH);
}

/**
 * Replace the one placeholder with `<version> · build <id>`. No colon: the
 * placeholder sits in a Style Settings description, where a `key: value`
 * fragment fails the whole @settings block.
 */
export function stampBuild(css, version) {
  const found = css.split(BUILD_PLACEHOLDER).length - 1;
  if (found !== 1) throw new Error(`theme.src.css must carry ${BUILD_PLACEHOLDER} exactly once (found ${found})`);
  if (!SEMVER.test(version)) throw new Error(`version '${version}' is not X.Y.Z — read it from manifest.json`);
  const id = buildIdOf(css);
  return { css: css.replace(BUILD_PLACEHOLDER, `${version} · build ${id}`), id };
}
