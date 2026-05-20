"use client";

// Workspace icon system. Wraps Phosphor's duotone weight in a fixed colour
// palette matched to the Framer "Business Flat" icon set:
//   - Primary fill (the dark part):   #0B3D7A  (deep navy, same as --color-deep-blue)
//   - Secondary fill (the accent):    #2563EB  (accent blue, drawn at 35% opacity)
//
// API mirrors lucide-react so call sites need almost no change. Each lucide
// name is re-exported pointing at the closest Phosphor duotone equivalent.
// Replace `from "lucide-react"` with `from "@/components/shared/Icon"` and
// the same import names will keep working.

import { IconContext } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import {
  ActivityIcon,
  AppWindowIcon,
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  AndroidLogoIcon,
  AppleLogoIcon,
  BellIcon,
  BookOpenIcon,
  BooksIcon,
  BookmarkIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CaretRightIcon,
  CaretUpIcon,
  ChartBarIcon,
  ChartLineIcon,
  ChartPieIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  CheckIcon,
  CircleNotchIcon,
  ClipboardTextIcon,
  ClockIcon,
  CodeIcon,
  CompassIcon,
  CopyIcon,
  CurrencyDollarIcon,
  DeviceMobileIcon,
  DownloadSimpleIcon,
  EraserIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  FunnelIcon,
  GameControllerIcon,
  GaugeIcon,
  GearIcon,
  GlobeIcon,
  GridFourIcon,
  HashIcon,
  HeartIcon,
  HouseIcon,
  ImageIcon,
  InfoIcon,
  LightbulbIcon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  MedalIcon,
  PenNibIcon,
  ArrowFatUpIcon,
  ArrowUpRightIcon,
  CameraIcon,
  KeyIcon,
  StackIcon,
  SquaresFourIcon,
  ChatTeardropIcon,
  MusicNoteIcon,
  PaletteIcon,
  PencilIcon,
  RulerIcon,
  MinusIcon,
  PaperPlaneTiltIcon,
  LockIcon,
  BracketsCurlyIcon,
  MapPinIcon,
  MegaphoneIcon,
  PencilSimpleIcon,
  PlusIcon,
  QuestionIcon,
  RobotIcon,
  RocketLaunchIcon,
  SignOutIcon,
  SkipForwardIcon,
  SlidersIcon,
  SmileyIcon,
  SparkleIcon,
  StarIcon,
  StorefrontIcon,
  TagIcon,
  TargetIcon,
  TrashIcon,
  TrendUpIcon,
  UserCircleIcon,
  UserIcon,
  UsersIcon,
  WarningIcon,
  WrenchIcon,
  XCircleIcon,
  XIcon,
} from "@phosphor-icons/react";

export const DUOTONE_PRIMARY = "#0B3D7A";
export const DUOTONE_ACCENT = "#2563EB";

// Wrap the app once at the top so every Phosphor icon underneath inherits
// the duotone palette without per-call props.
export function IconProvider({ children }: { children: ReactNode }) {
  // NB: only pass props that Phosphor's IconContext is guaranteed to consume
  // (weight / color / size / mirrored). Earlier we tried setting
  // duotoneColor + duotoneOpacity here, but in @phosphor-icons/react@2.1
  // those leak through to the underlying <svg>, triggering a React DOM
  // warning. They still work fine when passed per-icon if we need to
  // override the auto-derived secondary later.
  return (
    <IconContext.Provider
      value={{
        weight: "duotone",
        color: DUOTONE_PRIMARY,
        size: 18,
        mirrored: false,
      }}
    >
      {children}
    </IconContext.Provider>
  );
}

export type LucideIcon = typeof HouseIcon;
export type Icon = LucideIcon;

// ─── lucide-react name → Phosphor duotone mapping ─────────────────────────
// Re-exported under the lucide names so call sites can just swap the import
// path. Left = lucide name (drop-in target), right = Phosphor equivalent.

// Navigation / workspace
export const LayoutDashboard = HouseIcon;
export const History = ClockIcon;
export const BookOpen = BookOpenIcon;
export const Smartphone = DeviceMobileIcon;
export const Settings = GearIcon;
export const LogOut = SignOutIcon;
export const Search = MagnifyingGlassIcon;
export const Menu = ListIcon;

// Tools — generic AI / scoring fallbacks still available under the lucide
// names. The ASO-specific tools use the more specific aliases below.
export const Wand2 = MagicWandIcon;
export const Sparkles = SparkleIcon;
// ASO Generator writes copy → pen nib reads as "writing tool" instead of
// generic AI magic-wand.
export const AsoGenerator = PenNibIcon;
// ASO Score grades a listing 0-100 with a letter grade → medal reads as
// "scored / awarded a grade" instead of generic sparkle.
export const AsoScore = MedalIcon;
export const Image = ImageIcon;
export const MessageSquare = ChatCircleIcon;
export const Target = TargetIcon;
export const Tag = TagIcon;
export const Gauge = GaugeIcon;
export const Compass = CompassIcon;

// Directional + actions
export const ArrowRight = ArrowRightIcon;
export const ArrowLeft = ArrowLeftIcon;
export const ChevronDown = CaretDownIcon;
export const ChevronUp = CaretUpIcon;
export const ChevronRight = CaretRightIcon;
export const X = XIcon;
export const Plus = PlusIcon;
export const Check = CheckIcon;
export const CheckCircle2 = CheckCircleIcon;
export const AlertCircle = WarningIcon;
export const AlertTriangle = WarningIcon;
export const Info = InfoIcon;
export const Trash2 = TrashIcon;
export const Copy = CopyIcon;
export const Download = DownloadSimpleIcon;
export const ExternalLink = ArrowSquareOutIcon;
export const RotateCcw = ArrowsClockwiseIcon;
export const RefreshCw = ArrowsClockwiseIcon;
export const Archive = ArchiveIcon;
export const Save = BookmarkIcon;
export const Edit3 = PencilSimpleIcon;
export const FileText = FileTextIcon;
export const Folder = FolderIcon;
export const AppWindow = AppWindowIcon;
export const Bookmark = BookmarkIcon;
export const Eye = EyeIcon;
export const Funnel = FunnelIcon;
export const SkipForward = SkipForwardIcon;
export const Link2 = LinkIcon;
export const PenLine = PencilSimpleIcon;
export const Sliders = SlidersIcon;
export const ListChecks = ListChecksIcon;
export const ClipboardText = ClipboardTextIcon;

// Status / chart
export const Star = StarIcon;
export const TrendingUp = TrendUpIcon;
export const ChartBar = ChartBarIcon;
export const ChartLine = ChartLineIcon;
export const ChartPie = ChartPieIcon;
export const Hash = HashIcon;
export const Clock = ClockIcon;
export const Calendar = CalendarBlankIcon;
export const DollarSign = CurrencyDollarIcon;
export const Lightbulb = LightbulbIcon;
export const Megaphone = MegaphoneIcon;
export const Rocket = RocketLaunchIcon;
export const Storefront = StorefrontIcon;
export const Bell = BellIcon;
export const MapPin = MapPinIcon;

// Platforms / brand
export const Apple = AppleLogoIcon;
export const Android = AndroidLogoIcon;
export const Globe = GlobeIcon;

// People / category
export const Users = UsersIcon;
export const User = UserIcon;
export const UserCircle = UserCircleIcon;
export const Heart = HeartIcon;
export const Wallet = CurrencyDollarIcon;
export const Activity = ActivityIcon;
export const Code = CodeIcon;
export const Gamepad2 = GameControllerIcon;
export const Brain = RobotIcon;
export const Zap = RocketLaunchIcon;
export const Grid3X3 = GridFourIcon;

// Misc
export const Loader2 = CircleNotchIcon;
export const Question = QuestionIcon;
export const HelpCircle = QuestionIcon;
export const XCircle = XCircleIcon;
export const Sparkle = SparkleIcon;
export const Wrench = WrenchIcon;
export const Smiley = SmileyIcon;
export const Books = BooksIcon;
export const Eraser = EraserIcon;

// Additional lucide aliases used across landing / dashboards
export const ArrowBigUp = ArrowFatUpIcon;
export const ArrowUpRight = ArrowUpRightIcon;
export const BarChart3 = ChartBarIcon;
export const Camera = CameraIcon;
export const Key = KeyIcon;
export const Layers = StackIcon;
export const LayoutGrid = SquaresFourIcon;
export const MessageCircle = ChatTeardropIcon;
export const Music = MusicNoteIcon;
export const Palette = PaletteIcon;
export const Pencil = PencilIcon;
export const RefreshCcw = ArrowsClockwiseIcon;
export const Ruler = RulerIcon;
export const Minus = MinusIcon;
export const Send = PaperPlaneTiltIcon;
export const Lock = LockIcon;
export const Code2 = BracketsCurlyIcon;
// Generic Phosphor names — exported directly under their Phosphor name so
// pages can pick a thematic icon without a lucide alias.
export const MagnifyingGlass = MagnifyingGlassIcon;
export const Medal = MedalIcon;
