/**
 * Icon layer.
 *
 * Screens are authored against a small, stable set of icon names. They are
 * rendered by **lucide-react** (crisp 24px grid, tree-shakable named exports)
 * through this thin adapter, which keeps the call-site API unchanged (`size`,
 * `weight="fill"` | `"bold"` | `"regular"`) so no component needs to know which
 * icon library sits behind it.
 *
 * Swapping icon sets is therefore a one-file change.
 */
import { forwardRef } from 'react'
import {
  Archive as LucideArchive,
  ArrowDown as LucideArrowDown,
  ArrowLeft as LucideArrowLeft,
  ArrowRight as LucideArrowRight,
  ArrowUp as LucideArrowUp,
  Bell as LucideBell,
  Bot as LucideBot,
  Brain as LucideBrain,
  Calendar as LucideCalendar,
  Check as LucideCheck,
  Clock as LucideClock,
  ChevronsLeft as LucideChevronsLeft,
  ChevronsRight as LucideChevronsRight,
  CircleCheck as LucideCircleCheck,
  CircleHelp as LucideCircleHelp,
  CircleUserRound as LucideCircleUserRound,
  CircleX as LucideCircleX,
  CloudUpload as LucideCloudUpload,
  Copy as LucideCopy,
  Download as LucideDownload,
  ExternalLink as LucideExternalLink,
  Globe as LucideGlobe,
  History as LucideHistory,
  House as LucideHouse,
  Info as LucideInfo,
  Key as LucideKey,
  LogIn as LucideLogIn,
  LogOut as LucideLogOut,
  Mail as LucideMail,
  MessagesSquare as LucideMessagesSquare,
  Monitor as LucideMonitor,
  Moon as LucideMoon,
  NotebookText as LucideNotebookText,
  Paintbrush as LucidePaintbrush,
  PanelRight as LucidePanelRight,
  PencilLine as LucidePencilLine,
  Phone as LucidePhone,
  Pin as LucidePin,
  Plug as LucidePlug,
  Plus as LucidePlus,
  RotateCcw as LucideRotateCcw,
  Search as LucideSearch,
  Settings as LucideSettings,
  ShieldCheck as LucideShieldCheck,
  Snowflake as LucideSnowflake,
  Sparkles as LucideSparkles,
  SquareCheck as LucideSquareCheck,
  SquarePen as LucideSquarePen,
  StickyNote as LucideStickyNote,
  Sun as LucideSun,
  Trash2 as LucideTrash2,
  TriangleAlert as LucideTriangleAlert,
  Users as LucideUsers,
  UsersRound as LucideUsersRound,
  WifiOff as LucideWifiOff,
  X as LucideX,
  Zap as LucideZap,
} from 'lucide-react'

/** Map the Phosphor-style prop surface onto lucide's. */
function icon(LucideIcon, displayName) {
  const Component = forwardRef(function Icon(
    { size = 24, weight = 'regular', className, color, ...rest },
    ref,
  ) {
    const filled = weight === 'fill'
    return (
      <LucideIcon
        ref={ref}
        size={size}
        color={color}
        className={className}
        strokeWidth={filled ? 0 : weight === 'bold' ? 2.5 : 2}
        fill={filled ? 'currentColor' : 'none'}
        aria-hidden={rest['aria-label'] ? undefined : true}
        {...rest}
      />
    )
  })
  Component.displayName = displayName
  return Component
}

/* Every icon the app uses, exported under its stable call-site name. */
export const Archive = icon(LucideArchive, 'Archive')
export const ArrowCounterClockwise = icon(LucideRotateCcw, 'ArrowCounterClockwise')
export const ArrowDown = icon(LucideArrowDown, 'ArrowDown')
export const ArrowLeft = icon(LucideArrowLeft, 'ArrowLeft')
export const ArrowRight = icon(LucideArrowRight, 'ArrowRight')
export const ArrowUp = icon(LucideArrowUp, 'ArrowUp')
export const Bell = icon(LucideBell, 'Bell')
export const Brain = icon(LucideBrain, 'Brain')
export const Calendar = icon(LucideCalendar, 'Calendar')
export const CalendarBlank = icon(LucideCalendar, 'CalendarBlank')
export const Clock = icon(LucideClock, 'Clock')
export const CaretDoubleLeft = icon(LucideChevronsLeft, 'CaretDoubleLeft')
export const CaretDoubleRight = icon(LucideChevronsRight, 'CaretDoubleRight')
export const ChatCircleDots = icon(LucideMessagesSquare, 'ChatCircleDots')
export const Check = icon(LucideCheck, 'Check')
export const CheckCircle = icon(LucideCircleCheck, 'CheckCircle')
export const CheckSquare = icon(LucideSquareCheck, 'CheckSquare')
export const ClockCounterClockwise = icon(LucideHistory, 'ClockCounterClockwise')
export const CloudArrowUp = icon(LucideCloudUpload, 'CloudArrowUp')
export const CopySimple = icon(LucideCopy, 'CopySimple')
export const DownloadSimple = icon(LucideDownload, 'DownloadSimple')
export const EnvelopeSimple = icon(LucideMail, 'EnvelopeSimple')
export const GearSix = icon(LucideSettings, 'GearSix')
export const Globe = icon(LucideGlobe, 'Globe')
export const HouseSimple = icon(LucideHouse, 'HouseSimple')
export const Info = icon(LucideInfo, 'Info')
export const Key = icon(LucideKey, 'Key')
export const Lightning = icon(LucideZap, 'Lightning')
export const LinkedinLogo = icon(LucideExternalLink, 'LinkedinLogo')
export const MagnifyingGlass = icon(LucideSearch, 'MagnifyingGlass')
export const Monitor = icon(LucideMonitor, 'Monitor')
export const Moon = icon(LucideMoon, 'Moon')
export const Note = icon(LucideStickyNote, 'Note')
export const NoteBlank = icon(LucideNotebookText, 'NoteBlank')
export const NotePencil = icon(LucideSquarePen, 'NotePencil')
export const PaintBrush = icon(LucidePaintbrush, 'PaintBrush')
export const PencilSimpleLine = icon(LucidePencilLine, 'PencilSimpleLine')
export const Phone = icon(LucidePhone, 'Phone')
export const PlugsConnected = icon(LucidePlug, 'PlugsConnected')
export const Plus = icon(LucidePlus, 'Plus')
export const PushPin = icon(LucidePin, 'PushPin')
export const Question = icon(LucideCircleHelp, 'Question')
export const Robot = icon(LucideBot, 'Robot')
export const ShieldCheck = icon(LucideShieldCheck, 'ShieldCheck')
export const SidebarSimple = icon(LucidePanelRight, 'SidebarSimple')
export const SignIn = icon(LucideLogIn, 'SignIn')
export const SignOut = icon(LucideLogOut, 'SignOut')
export const Snowflake = icon(LucideSnowflake, 'Snowflake')
export const Sparkle = icon(LucideSparkles, 'Sparkle')
export const Sun = icon(LucideSun, 'Sun')
export const Trash = icon(LucideTrash2, 'Trash')
export const UserCircle = icon(LucideCircleUserRound, 'UserCircle')
export const Users = icon(LucideUsers, 'Users')
export const UsersThree = icon(LucideUsersRound, 'UsersThree')
export const Warning = icon(LucideTriangleAlert, 'Warning')
export const WifiSlash = icon(LucideWifiOff, 'WifiSlash')
export const X = icon(LucideX, 'X')
export const XCircle = icon(LucideCircleX, 'XCircle')
