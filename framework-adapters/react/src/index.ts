// @cameronsjo/artificer/react — React adapter, compiled to dist/react.
// Primitives emit canonical classes; chrome components single-source the app
// shell; behavior stays in the vanilla modules (theme/focus/icons).

export {
  cx,
  safeHref,
  Stack,
  Cluster,
  Container,
  GridAuto,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Notification,
  Modal,
  Icon,
  useIcons,
  useWhimsy,
} from './primitives.js';

export {
  ThemeToggle,
  useThemeMode,
  AppShell,
  AppShellContent,
  Appbar,
  NavDrawer,
  SideNav,
  SideNavFooter,
} from './chrome.js';
export type { SideNavItem, SideNavGroup } from './chrome.js';

export {
  defaultSectionOpen,
  onNavigationActivates,
  onUserToggle,
  onViewportChange,
} from './sidenav-sections.js';
export type { SectionOpenState, Viewport } from './sidenav-sections.js';
