'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  RiDashboardLine,
  RiInboxLine,
  RiHistoryLine,
  RiSettings4Line,
  RiLinkedinBoxFill,
  RiMailSendLine,
  RiShieldCheckLine,
  RiAlertLine,
  RiTimeLine,
  RiUserLine,
  RiSearchLine,
  RiMenuLine,
  RiCloseLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiEditLine,
  RiRefreshLine,
  RiArrowRightSLine,
  RiFileTextLine,
  RiMailLine,
  RiFlag2Line,
  RiSpamLine,
  RiSendPlaneLine,
  RiInformationLine,
  RiCheckboxCircleLine,
  RiLoader4Line,
  RiArrowLeftSLine,
  RiSaveLine,
  RiFilterLine,
  RiExpandUpDownLine,
  RiMailCheckLine,
  RiStarLine,
  RiErrorWarningLine,
  RiRadarLine,
  RiMessage2Line,
  RiPulseLine,
  RiLink,
  RiLinkUnlink
} from 'react-icons/ri'

// ---- Types ----

interface SummaryData {
  total_processed: number
  auto_replied: number
  flagged: number
}

interface AutoReply {
  sender_name: string
  sender_title: string
  category: string
  original_message: string
  generated_reply: string
  timestamp: string
  status?: 'Auto' | 'Manual'
}

interface FlaggedMessage {
  sender_name: string
  sender_title: string
  category: string
  original_message: string
  flag_reason: string
  priority: string
  timestamp: string
}

interface ActivityItem {
  action: string
  sender_name: string
  category: string
  timestamp: string
}

interface DraftMeta {
  tone: string
  analysis: string
  confidence: number
  alternatives: string[]
  category: string
}

interface Stats {
  totalMessages: number
  autoReplied: number
  flagged: number
  pending: number
}

interface Settings {
  name: string
  title: string
  industry: string
  company: string
  website: string
  skills: string[]
  openTo: string[]
  tone: 'Professional' | 'Casual'
  maxReplyLength: number
  autoReplyCategories: string[]
  flagCategories: string[]
}

type PageType = 'dashboard' | 'review' | 'history' | 'settings'
type ConnectionStatus = 'connected' | 'checking' | 'disconnected' | 'reconnecting'

interface ConnectionState {
  status: ConnectionStatus
  lastChecked: Date | null
  latency: number | null
  consecutiveFailures: number
  uptime: number
  lastSuccessful: Date | null
}

// ---- Constants ----

const CONNECTION_CHECK_INTERVAL = 30000 // 30 seconds
const CONNECTION_TIMEOUT = 15000 // 15 seconds for health check
const MAX_FAILURES_BEFORE_DISCONNECT = 2

const AGENT_SCAN_ID = '69996017746ef9435cac7ed5'
const AGENT_DRAFT_ID = '69996017c066ed107671abdc'

const ALL_CATEGORIES = ['greeting', 'job_offer', 'collaboration', 'sales_pitch', 'spam', 'follow_up', 'general', 'sensitive', 'urgent']

const DEFAULT_SETTINGS: Settings = {
  name: '',
  title: '',
  industry: '',
  company: '',
  website: '',
  skills: [],
  openTo: [],
  tone: 'Professional',
  maxReplyLength: 150,
  autoReplyCategories: ['greeting', 'follow_up', 'general'],
  flagCategories: ['spam', 'sensitive', 'urgent', 'job_offer', 'collaboration', 'sales_pitch'],
}

const OPEN_TO_OPTIONS = ['Networking', 'Freelance', 'Job Offers', 'Partnerships']

// ---- Sample Data ----

const SAMPLE_ACTIVITY: ActivityItem[] = [
  { action: 'Auto-replied', sender_name: 'Sarah Chen', category: 'greeting', timestamp: '2 min ago' },
  { action: 'Flagged for review', sender_name: 'Mike Johnson', category: 'job_offer', timestamp: '5 min ago' },
  { action: 'Auto-replied', sender_name: 'Emily Davis', category: 'follow_up', timestamp: '8 min ago' },
  { action: 'Flagged as spam', sender_name: 'Sales Bot 3000', category: 'spam', timestamp: '12 min ago' },
  { action: 'Auto-replied', sender_name: 'Alex Rivera', category: 'general', timestamp: '15 min ago' },
]

const SAMPLE_FLAGGED: FlaggedMessage[] = [
  {
    sender_name: 'Mike Johnson',
    sender_title: 'VP of Engineering at TechCorp',
    category: 'job_offer',
    original_message: 'Hi! We have an exciting Senior Engineering role that matches your profile perfectly. Would love to discuss compensation and team structure. Are you open for a quick call this week?',
    flag_reason: 'Job offer requires personal review',
    priority: 'high',
    timestamp: '5 min ago',
  },
  {
    sender_name: 'Lisa Wang',
    sender_title: 'Founder at StartupXYZ',
    category: 'collaboration',
    original_message: 'I saw your recent article on AI integration. We are building something similar and would love to explore a potential partnership. Can we schedule a 30-min chat?',
    flag_reason: 'Collaboration request needs evaluation',
    priority: 'medium',
    timestamp: '20 min ago',
  },
  {
    sender_name: 'Sales Bot 3000',
    sender_title: 'Account Executive at SpamCo',
    category: 'spam',
    original_message: 'URGENT: Your business needs our revolutionary AI solution! Limited time offer - 90% discount if you sign up TODAY! Click here now!!!',
    flag_reason: 'Detected as spam/unsolicited sales',
    priority: 'low',
    timestamp: '30 min ago',
  },
]

const SAMPLE_REPLIES: AutoReply[] = [
  {
    sender_name: 'Sarah Chen',
    sender_title: 'Product Manager at InnovateCo',
    category: 'greeting',
    original_message: 'Hey! Great connecting with you at the conference last week. Looking forward to staying in touch!',
    generated_reply: 'Thanks for reaching out, Sarah! It was great meeting you at the conference. Looking forward to staying connected and exploring potential synergies.',
    timestamp: '2 min ago',
    status: 'Auto',
  },
  {
    sender_name: 'Emily Davis',
    sender_title: 'Marketing Lead at GrowthHub',
    category: 'follow_up',
    original_message: 'Following up on our conversation about the Q4 content strategy. Did you have a chance to review the proposal I sent?',
    generated_reply: 'Hi Emily, thanks for following up! I have reviewed the proposal and it looks promising. Let me get back to you with detailed feedback by end of week.',
    timestamp: '8 min ago',
    status: 'Auto',
  },
  {
    sender_name: 'Alex Rivera',
    sender_title: 'Data Scientist at AnalyticsPro',
    category: 'general',
    original_message: 'Hi! I noticed we share a mutual connection. Would love to connect and share insights about the data science space.',
    generated_reply: 'Hi Alex! Thanks for connecting. Always happy to chat with fellow data enthusiasts. Feel free to reach out anytime to discuss trends and insights.',
    timestamp: '15 min ago',
    status: 'Auto',
  },
]

// ---- Helpers ----

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    greeting: 'bg-blue-100 text-blue-800 border-blue-200',
    job_offer: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    collaboration: 'bg-purple-100 text-purple-800 border-purple-200',
    sales_pitch: 'bg-orange-100 text-orange-800 border-orange-200',
    spam: 'bg-red-100 text-red-800 border-red-200',
    follow_up: 'bg-teal-100 text-teal-800 border-teal-200',
    general: 'bg-gray-100 text-gray-800 border-gray-200',
    sensitive: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    urgent: 'bg-red-200 text-red-900 border-red-300',
  }
  return map[category] || 'bg-gray-100 text-gray-800 border-gray-200'
}

function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return map[priority] || 'bg-gray-100 text-gray-600 border-gray-200'
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

// ---- Real-Time Connection Hook ----

function useLinkedInConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'checking',
    lastChecked: null,
    latency: null,
    consecutiveFailures: 0,
    uptime: 0,
    lastSuccessful: null,
  })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const uptimeStartRef = useRef<Date>(new Date())
  const mountedRef = useRef(true)

  const checkConnection = useCallback(async () => {
    if (!mountedRef.current) return

    const startTime = Date.now()
    setConnectionState((prev) => ({
      ...prev,
      status: prev.status === 'disconnected' ? 'reconnecting' : prev.consecutiveFailures === 0 ? prev.status : 'checking',
    }))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT)

      const result = await callAIAgent(
        'Connection health check: respond with status OK',
        AGENT_SCAN_ID
      )

      clearTimeout(timeoutId)

      if (!mountedRef.current) return

      const latency = Date.now() - startTime
      const now = new Date()

      if (result.success || result.response?.status === 'success') {
        setConnectionState((prev) => ({
          status: 'connected',
          lastChecked: now,
          latency,
          consecutiveFailures: 0,
          uptime: Math.floor((now.getTime() - uptimeStartRef.current.getTime()) / 1000),
          lastSuccessful: now,
        }))
      } else {
        setConnectionState((prev) => {
          const failures = prev.consecutiveFailures + 1
          return {
            ...prev,
            status: failures >= MAX_FAILURES_BEFORE_DISCONNECT ? 'disconnected' : 'checking',
            lastChecked: now,
            latency,
            consecutiveFailures: failures,
            uptime: Math.floor((now.getTime() - uptimeStartRef.current.getTime()) / 1000),
          }
        })
      }
    } catch (error) {
      if (!mountedRef.current) return
      const now = new Date()
      setConnectionState((prev) => {
        const failures = prev.consecutiveFailures + 1
        return {
          ...prev,
          status: failures >= MAX_FAILURES_BEFORE_DISCONNECT ? 'disconnected' : 'checking',
          lastChecked: now,
          latency: null,
          consecutiveFailures: failures,
          uptime: Math.floor((now.getTime() - uptimeStartRef.current.getTime()) / 1000),
        }
      })
    }
  }, [])

  const manualReconnect = useCallback(() => {
    setConnectionState((prev) => ({
      ...prev,
      status: 'reconnecting',
      consecutiveFailures: 0,
    }))
    checkConnection()
  }, [checkConnection])

  useEffect(() => {
    mountedRef.current = true
    uptimeStartRef.current = new Date()

    // Initial check after short delay
    const initialTimeout = setTimeout(() => {
      checkConnection()
    }, 1500)

    // Periodic checks
    intervalRef.current = setInterval(() => {
      checkConnection()
    }, CONNECTION_CHECK_INTERVAL)

    return () => {
      mountedRef.current = false
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [checkConnection])

  return { connectionState, manualReconnect }
}

// ---- Connection Status Indicator (Header) ----

function ConnectionIndicator({
  connectionState,
  onReconnect,
}: {
  connectionState: ConnectionState
  onReconnect: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  const statusConfig: Record<ConnectionStatus, { dot: string; bg: string; text: string; label: string; animate: boolean }> = {
    connected: {
      dot: 'bg-emerald-500',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-700',
      label: 'Connected',
      animate: false,
    },
    checking: {
      dot: 'bg-amber-400',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-700',
      label: 'Checking...',
      animate: true,
    },
    disconnected: {
      dot: 'bg-red-500',
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      label: 'Disconnected',
      animate: false,
    },
    reconnecting: {
      dot: 'bg-blue-400',
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      label: 'Reconnecting...',
      animate: true,
    },
  }

  const config = statusConfig[connectionState.status]

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diffSec < 5) return 'Just now'
    if (diffSec < 60) return `${diffSec}s ago`
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
    return `${Math.floor(diffSec / 3600)}h ago`
  }

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 hover:shadow-sm ${config.bg}`}
      >
        <div className="relative flex items-center justify-center w-3 h-3">
          <div className={`w-2 h-2 rounded-full ${config.dot} ${config.animate ? 'animate-pulse' : ''}`} />
          {connectionState.status === 'connected' && (
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 opacity-30 animate-ping" />
          )}
        </div>
        <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
        {connectionState.latency !== null && connectionState.status === 'connected' && (
          <span className="text-[10px] text-emerald-500 font-mono">{connectionState.latency}ms</span>
        )}
        <RiLinkedinBoxFill className={`w-3.5 h-3.5 ${config.text}`} />
      </button>

      {showDetails && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 z-50 rounded-xl border border-border bg-white shadow-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiLinkedinBoxFill className="w-5 h-5 text-[#0A66C2]" />
                <span className="text-sm font-semibold text-foreground">LinkedIn Connection</span>
              </div>
              <button onClick={() => setShowDetails(false)} className="p-1 rounded-md hover:bg-accent">
                <RiCloseLine className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${config.dot} ${config.animate ? 'animate-pulse' : ''}`} />
              <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
              {connectionState.status === 'connected' && (
                <RiLink className="w-4 h-4 text-emerald-600 ml-auto" />
              )}
              {connectionState.status === 'disconnected' && (
                <RiLinkUnlink className="w-4 h-4 text-red-500 ml-auto" />
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Last Checked</span>
                <span className="text-foreground font-medium">{formatTime(connectionState.lastChecked)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Last Successful</span>
                <span className="text-foreground font-medium">{formatTime(connectionState.lastSuccessful)}</span>
              </div>
              {connectionState.latency !== null && (
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Response Latency</span>
                  <span className="text-foreground font-mono font-medium">{connectionState.latency}ms</span>
                </div>
              )}
              <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Session Uptime</span>
                <span className="text-foreground font-medium">{formatUptime(connectionState.uptime)}</span>
              </div>
              {connectionState.consecutiveFailures > 0 && (
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Failed Checks</span>
                  <span className="text-red-600 font-medium">{connectionState.consecutiveFailures}</span>
                </div>
              )}
            </div>

            {connectionState.status === 'disconnected' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onReconnect() }}
                className="w-full text-xs"
              >
                <RiRefreshLine className="w-3.5 h-3.5 mr-1.5" />
                Reconnect Now
              </Button>
            )}

            {connectionState.status === 'connected' && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-50 text-emerald-700">
                <RiCheckboxCircleLine className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[11px]">Agent is active and processing messages</span>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">Auto-checks every 30 seconds</p>
          </div>
        </>
      )}
    </div>
  )
}

// ---- Error Boundary ----

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- Glass Card Wrapper ----

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[0.875rem] border border-white/20 bg-white/75 shadow-md backdrop-blur-[16px] ${className}`}>
      {children}
    </div>
  )
}

// ---- Inline Status Banner ----

function StatusBanner({ message, type, onDismiss }: { message: string; type: 'success' | 'error' | 'info'; onDismiss: () => void }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  const icons = {
    success: <RiCheckboxCircleLine className="w-4 h-4 flex-shrink-0" />,
    error: <RiErrorWarningLine className="w-4 h-4 flex-shrink-0" />,
    info: <RiInformationLine className="w-4 h-4 flex-shrink-0" />,
  }
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-[0.875rem] border text-sm ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <RiCloseLine className="w-4 h-4" />
      </button>
    </div>
  )
}

// ---- Stat Card ----

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return (
    <GlassCard className="p-5 flex items-center gap-4 hover:shadow-lg transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground font-sans">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </GlassCard>
  )
}

// ---- Sidebar ----

function Sidebar({
  currentPage,
  onNavigate,
  collapsed,
  onToggle,
  flaggedCount,
  connectionStatus,
}: {
  currentPage: PageType
  onNavigate: (page: PageType) => void
  collapsed: boolean
  onToggle: () => void
  flaggedCount: number
  connectionStatus: ConnectionStatus
}) {
  const items: { key: PageType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <RiDashboardLine className="w-5 h-5" /> },
    { key: 'review', label: 'Review Queue', icon: <RiInboxLine className="w-5 h-5" />, badge: flaggedCount },
    { key: 'history', label: 'Reply History', icon: <RiHistoryLine className="w-5 h-5" /> },
    { key: 'settings', label: 'Settings', icon: <RiSettings4Line className="w-5 h-5" /> },
  ]

  return (
    <aside className={`fixed left-0 top-0 h-full z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} flex flex-col border-r border-border bg-white/80 backdrop-blur-[16px]`}>
      <div className="h-16 flex items-center px-4 gap-3 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <RiLinkedinBoxFill className="w-7 h-7 text-[#0A66C2] flex-shrink-0" />
            <span className="font-semibold text-sm text-foreground truncate font-sans">AutoTask</span>
          </div>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
          {collapsed ? <RiMenuLine className="w-5 h-5 text-foreground" /> : <RiArrowLeftSLine className="w-5 h-5 text-foreground" />}
        </button>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {items.map((item) => (
          <TooltipProvider key={item.key} delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onNavigate(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${currentPage === item.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                  {!collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-semibold">{item.badge}</span>
                  )}
                  {collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute right-1 top-0 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">{item.badge}</span>
                  )}
                </button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-border">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            connectionStatus === 'connected' ? 'bg-emerald-500' :
            connectionStatus === 'checking' || connectionStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse' :
            'bg-red-500'
          }`} />
          {!collapsed && (
            <span className={`text-xs ${
              connectionStatus === 'connected' ? 'text-muted-foreground' :
              connectionStatus === 'disconnected' ? 'text-red-600' :
              'text-amber-600'
            }`}>
              {connectionStatus === 'connected' ? 'LinkedIn Connected' :
               connectionStatus === 'checking' ? 'Checking...' :
               connectionStatus === 'reconnecting' ? 'Reconnecting...' :
               'Disconnected'}
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}

// ---- Top Header ----

function TopHeader({
  settings,
  collapsed,
  connectionState,
  onReconnect,
}: {
  settings: Settings
  collapsed: boolean
  connectionState: ConnectionState
  onReconnect: () => void
}) {
  return (
    <header className={`fixed top-0 right-0 h-16 z-30 flex items-center justify-between px-6 border-b border-border bg-white/80 backdrop-blur-[16px] transition-all duration-300 ${collapsed ? 'left-16' : 'left-60'}`}>
      <h1 className="text-lg font-semibold text-foreground font-sans">AutoTask LinkedIn Reply</h1>
      <div className="flex items-center gap-4">
        <ConnectionIndicator connectionState={connectionState} onReconnect={onReconnect} />
        <Avatar className="w-8 h-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {settings.name ? getInitials(settings.name) : 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}

// ---- Dashboard Screen ----

function DashboardScreen({
  stats,
  activityFeed,
  isScanning,
  onScanAndReply,
  statusMessage,
  onDismissStatus,
  sampleMode,
  connectionStatus,
}: {
  stats: Stats
  activityFeed: ActivityItem[]
  isScanning: boolean
  onScanAndReply: () => void
  statusMessage: { message: string; type: 'success' | 'error' | 'info' } | null
  onDismissStatus: () => void
  sampleMode: boolean
  connectionStatus: ConnectionStatus
}) {
  const displayStats = sampleMode ? { totalMessages: 47, autoReplied: 32, flagged: 8, pending: 7 } : stats
  const displayFeed = sampleMode ? SAMPLE_ACTIVITY : activityFeed

  return (
    <div className="space-y-6">
      {statusMessage && (
        <StatusBanner message={statusMessage.message} type={statusMessage.type} onDismiss={onDismissStatus} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-sans">Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor your LinkedIn inbox automation</p>
        </div>
        <Button onClick={onScanAndReply} disabled={isScanning} className="px-6 py-2.5 font-medium shadow-sm">
          {isScanning ? (
            <>
              <RiLoader4Line className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RiRadarLine className="w-4 h-4 mr-2" />
              Scan & Reply
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<RiMailLine className="w-5 h-5 text-blue-600" />} label="Total Messages" value={displayStats.totalMessages} accent="bg-blue-100" />
        <StatCard icon={<RiMailCheckLine className="w-5 h-5 text-emerald-600" />} label="Auto-Replied" value={displayStats.autoReplied} accent="bg-emerald-100" />
        <StatCard icon={<RiFlag2Line className="w-5 h-5 text-amber-600" />} label="Flagged" value={displayStats.flagged} accent="bg-amber-100" />
        <StatCard icon={<RiTimeLine className="w-5 h-5 text-purple-600" />} label="Pending" value={displayStats.pending} accent="bg-purple-100" />
      </div>

      {isScanning && (
        <GlassCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <RiLoader4Line className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium text-foreground">Scanning inbox and processing messages...</span>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
          <RiPulseLine className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Recent Activity</h3>
        </div>
        <ScrollArea className="h-[360px]">
          {displayFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <RiInboxLine className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No activity yet</p>
              <p className="text-xs mt-1">Click "Scan & Reply" to start processing messages</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {displayFeed.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/30 transition-colors">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">{getInitials(item.sender_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-medium">{item.sender_name}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{item.action}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agents</h4>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
            <div className={`w-2 h-2 rounded-full ${
              isScanning ? 'bg-amber-400 animate-pulse' :
              connectionStatus === 'connected' ? 'bg-emerald-500' :
              connectionStatus === 'disconnected' ? 'bg-red-500' :
              'bg-amber-400 animate-pulse'
            }`} />
            <span className="text-xs font-medium text-foreground">Message Auto-Reply Agent</span>
            <span className={`text-[10px] ml-auto ${
              isScanning ? 'text-amber-600' :
              connectionStatus === 'connected' ? 'text-muted-foreground' :
              connectionStatus === 'disconnected' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {isScanning ? 'Processing' :
               connectionStatus === 'connected' ? 'Ready' :
               connectionStatus === 'disconnected' ? 'Offline' : 'Checking'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500' :
              connectionStatus === 'disconnected' ? 'bg-red-500' :
              'bg-amber-400 animate-pulse'
            }`} />
            <span className="text-xs font-medium text-foreground">Flagged Message Assistant</span>
            <span className={`text-[10px] ml-auto ${
              connectionStatus === 'connected' ? 'text-muted-foreground' :
              connectionStatus === 'disconnected' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {connectionStatus === 'connected' ? 'Ready' :
               connectionStatus === 'disconnected' ? 'Offline' : 'Checking'}
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

// ---- Review Queue Screen ----

function ReviewQueueScreen({
  flaggedMessages,
  selectedMessage,
  onSelectMessage,
  draftReply,
  setDraftReply,
  draftMeta,
  isDrafting,
  onDraftResponse,
  onSendReply,
  onDismiss,
  statusMessage,
  onDismissStatus,
  sampleMode,
}: {
  flaggedMessages: FlaggedMessage[]
  selectedMessage: FlaggedMessage | null
  onSelectMessage: (msg: FlaggedMessage | null) => void
  draftReply: string
  setDraftReply: (val: string) => void
  draftMeta: DraftMeta | null
  isDrafting: boolean
  onDraftResponse: (msg: FlaggedMessage) => void
  onSendReply: () => void
  onDismiss: () => void
  statusMessage: { message: string; type: 'success' | 'error' | 'info' } | null
  onDismissStatus: () => void
  sampleMode: boolean
}) {
  const displayMessages = sampleMode ? SAMPLE_FLAGGED : flaggedMessages

  return (
    <div className="space-y-4">
      {statusMessage && (
        <StatusBanner message={statusMessage.message} type={statusMessage.type} onDismiss={onDismissStatus} />
      )}

      <div>
        <h2 className="text-2xl font-bold text-foreground font-sans">Review Queue</h2>
        <p className="text-sm text-muted-foreground mt-1">Review and respond to flagged messages</p>
      </div>

      {displayMessages.length === 0 ? (
        <GlassCard className="p-12">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <RiShieldCheckLine className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium text-foreground mb-1">No flagged messages -- all clear!</p>
            <p className="text-sm">Your inbox is clean. Run a scan to check for new messages.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <GlassCard className="overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Flagged Messages ({displayMessages.length})</h3>
                <Badge variant="outline" className="text-[10px]">{displayMessages.length} items</Badge>
              </div>
              <ScrollArea className="h-[520px]">
                <div className="divide-y divide-border/50">
                  {displayMessages.map((msg, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectMessage(msg)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-accent/30 transition-all ${selectedMessage === msg ? 'bg-accent/50 border-l-2 border-l-primary' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-[9px] bg-secondary text-secondary-foreground">{getInitials(msg.sender_name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground truncate">{msg.sender_name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-1.5">{msg.sender_title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getCategoryColor(msg.category)}`}>{msg.category}</Badge>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getPriorityColor(msg.priority)}`}>{msg.priority}</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{msg.original_message}</p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </GlassCard>
          </div>

          <div className="lg:col-span-3">
            {selectedMessage ? (
              <GlassCard className="overflow-hidden">
                <div className="px-5 py-4 border-b border-border/50">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">{getInitials(selectedMessage.sender_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{selectedMessage.sender_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedMessage.sender_title}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={`text-[10px] ${getCategoryColor(selectedMessage.category)}`}>{selectedMessage.category}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${getPriorityColor(selectedMessage.priority)}`}>{selectedMessage.priority}</Badge>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Original Message</p>
                    <div className="p-3.5 bg-secondary/50 rounded-xl text-sm text-foreground leading-relaxed">
                      {selectedMessage.original_message}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <RiAlertLine className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800">{selectedMessage.flag_reason}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Response</p>
                      <Button variant="outline" size="sm" onClick={() => onDraftResponse(selectedMessage)} disabled={isDrafting} className="h-8 text-xs">
                        {isDrafting ? (
                          <>
                            <RiLoader4Line className="w-3 h-3 mr-1.5 animate-spin" />
                            Drafting...
                          </>
                        ) : (
                          <>
                            <RiEditLine className="w-3 h-3 mr-1.5" />
                            Draft Response
                          </>
                        )}
                      </Button>
                    </div>

                    {isDrafting ? (
                      <div className="space-y-2">
                        <Skeleton className="h-24 w-full rounded-xl" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ) : (
                      <>
                        <Textarea
                          value={draftReply}
                          onChange={(e) => setDraftReply(e.target.value)}
                          placeholder="Click 'Draft Response' to generate an AI suggestion, or type your own reply..."
                          rows={5}
                          className="rounded-xl resize-none text-sm"
                        />

                        {draftMeta && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {draftMeta.tone && (
                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Tone: {draftMeta.tone}</Badge>
                              )}
                              {draftMeta.category && (
                                <Badge variant="outline" className={`text-[10px] ${getCategoryColor(draftMeta.category)}`}>{draftMeta.category}</Badge>
                              )}
                              {draftMeta.confidence > 0 && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Confidence: {Math.round(draftMeta.confidence * 100)}%</Badge>
                              )}
                            </div>
                            {draftMeta.analysis && (
                              <div className="p-3 bg-secondary/30 rounded-lg">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Context Analysis</p>
                                <div className="text-xs text-foreground">{renderMarkdown(draftMeta.analysis)}</div>
                              </div>
                            )}
                            {draftMeta.alternatives.length > 0 && (
                              <div className="p-3 bg-secondary/30 rounded-lg">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Alternative Actions</p>
                                <ul className="space-y-1">
                                  {draftMeta.alternatives.map((alt, i) => (
                                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      <RiArrowRightSLine className="w-3 h-3 flex-shrink-0" />
                                      {alt}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center gap-3">
                    <Button onClick={onSendReply} disabled={!draftReply.trim()} className="flex-1">
                      <RiSendPlaneLine className="w-4 h-4 mr-2" />
                      Send Reply
                    </Button>
                    <Button variant="outline" onClick={onDismiss}>
                      <RiDeleteBinLine className="w-4 h-4 mr-2" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="h-[580px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <RiMessage2Line className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium text-foreground">Select a message</p>
                  <p className="text-xs mt-1">Choose a flagged message from the list to review</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Reply History Screen ----

function ReplyHistoryScreen({
  replyHistory,
  sampleMode,
}: {
  replyHistory: AutoReply[]
  sampleMode: boolean
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [selectedReply, setSelectedReply] = useState<AutoReply | null>(null)

  const displayReplies = sampleMode ? SAMPLE_REPLIES : replyHistory

  const filtered = displayReplies.filter((r) => {
    const matchesSearch = !searchQuery || (r.sender_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground font-sans">Reply History</h2>
        <p className="text-sm text-muted-foreground mt-1">View all sent replies and their details</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by sender name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val)}>
          <SelectTrigger className="w-full sm:w-48 rounded-xl">
            <div className="flex items-center gap-2">
              <RiFilterLine className="w-4 h-4 text-muted-foreground" />
              <SelectValue placeholder="Filter by category" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {ALL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <GlassCard className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <RiHistoryLine className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium text-foreground">No replies found</p>
            <p className="text-xs mt-1">{displayReplies.length === 0 ? 'Run a scan to start processing messages' : 'Try adjusting your search or filter'}</p>
          </div>
        ) : (
          <ScrollArea className="h-[520px]">
            <div className="divide-y divide-border/50">
              {filtered.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedReply(reply)}
                  className="w-full text-left px-5 py-4 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">{getInitials(reply.sender_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{reply.sender_name}</span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${getCategoryColor(reply.category)}`}>{reply.category}</Badge>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${reply.status === 'Auto' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{reply.status || 'Auto'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{reply.sender_title}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{reply.timestamp}</span>
                    <RiArrowRightSLine className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 pl-11">
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Message</p>
                      <p className="text-xs text-foreground truncate">{reply.original_message}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Reply</p>
                      <p className="text-xs text-foreground truncate">{reply.generated_reply}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </GlassCard>

      <Dialog open={!!selectedReply} onOpenChange={() => setSelectedReply(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <RiMessage2Line className="w-4 h-4" />
              Conversation Detail
            </DialogTitle>
            <DialogDescription className="text-xs">Full message and reply content</DialogDescription>
          </DialogHeader>
          {selectedReply && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">{getInitials(selectedReply.sender_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm text-foreground">{selectedReply.sender_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedReply.sender_title}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] ${getCategoryColor(selectedReply.category)}`}>{selectedReply.category}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${selectedReply.status === 'Auto' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{selectedReply.status || 'Auto'}</Badge>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Original Message</p>
                <div className="p-3 bg-secondary/50 rounded-xl text-sm text-foreground leading-relaxed">
                  {selectedReply.original_message}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Generated Reply</p>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-foreground leading-relaxed">
                  {selectedReply.generated_reply}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>{selectedReply.timestamp}</span>
                <span>Status: {selectedReply.status || 'Auto'}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Settings Screen ----

function SettingsScreen({
  settings,
  onUpdateSettings,
  onSave,
  statusMessage,
  onDismissStatus,
  connectionState,
  onReconnect,
}: {
  settings: Settings
  onUpdateSettings: (updates: Partial<Settings>) => void
  onSave: () => void
  statusMessage: { message: string; type: 'success' | 'error' | 'info' } | null
  onDismissStatus: () => void
  connectionState: ConnectionState
  onReconnect: () => void
}) {
  const [skillInput, setSkillInput] = useState('')

  const handleAddSkill = () => {
    if (skillInput.trim() && !settings.skills.includes(skillInput.trim())) {
      onUpdateSettings({ skills: [...settings.skills, skillInput.trim()] })
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (skill: string) => {
    onUpdateSettings({ skills: settings.skills.filter((s) => s !== skill) })
  }

  const handleOpenToToggle = (option: string) => {
    if (settings.openTo.includes(option)) {
      onUpdateSettings({ openTo: settings.openTo.filter((o) => o !== option) })
    } else {
      onUpdateSettings({ openTo: [...settings.openTo, option] })
    }
  }

  const handleAutoReplyCategoryToggle = (cat: string) => {
    if (settings.autoReplyCategories.includes(cat)) {
      onUpdateSettings({
        autoReplyCategories: settings.autoReplyCategories.filter((c) => c !== cat),
        flagCategories: [...settings.flagCategories, cat],
      })
    } else {
      onUpdateSettings({
        autoReplyCategories: [...settings.autoReplyCategories, cat],
        flagCategories: settings.flagCategories.filter((c) => c !== cat),
      })
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {statusMessage && (
        <StatusBanner message={statusMessage.message} type={statusMessage.type} onDismiss={onDismissStatus} />
      )}

      <div>
        <h2 className="text-2xl font-bold text-foreground font-sans">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure your profile and reply preferences</p>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <RiUserLine className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Profile Context</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">This information helps the AI draft better replies</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Name</Label>
              <Input id="name" placeholder="Your full name" value={settings.name} onChange={(e) => onUpdateSettings({ name: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs">Title</Label>
              <Input id="title" placeholder="e.g., Senior Engineer" value={settings.title} onChange={(e) => onUpdateSettings({ title: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="industry" className="text-xs">Industry</Label>
              <Input id="industry" placeholder="e.g., Technology" value={settings.industry} onChange={(e) => onUpdateSettings({ industry: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company" className="text-xs">Company</Label>
              <Input id="company" placeholder="Your company name" value={settings.company} onChange={(e) => onUpdateSettings({ company: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website" className="text-xs">Website</Label>
            <Input id="website" placeholder="https://yourwebsite.com" value={settings.website} onChange={(e) => onUpdateSettings({ website: e.target.value })} className="rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Skills</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill() } }}
                className="rounded-xl"
              />
              <Button variant="outline" size="sm" onClick={handleAddSkill} className="shrink-0 rounded-xl">Add</Button>
            </div>
            {settings.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {settings.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs px-2 py-0.5 gap-1">
                    {skill}
                    <button onClick={() => handleRemoveSkill(skill)} className="ml-0.5 hover:text-destructive">
                      <RiCloseLine className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Open To</Label>
            <div className="grid grid-cols-2 gap-2">
              {OPEN_TO_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 cursor-pointer hover:bg-accent/50 transition-colors">
                  <Checkbox checked={settings.openTo.includes(option)} onCheckedChange={() => handleOpenToToggle(option)} />
                  <span className="text-sm text-foreground">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <RiSettings4Line className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Reply Preferences</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Customize how the AI handles your messages</p>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Reply Tone</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Choose how the AI crafts responses</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${settings.tone === 'Professional' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Professional</span>
              <Switch checked={settings.tone === 'Casual'} onCheckedChange={(checked) => onUpdateSettings({ tone: checked ? 'Casual' : 'Professional' })} />
              <span className={`text-xs ${settings.tone === 'Casual' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Casual</span>
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <Label className="text-sm font-medium">Max Reply Length</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{settings.maxReplyLength} words</p>
              </div>
              <span className="text-sm font-medium text-primary">{settings.maxReplyLength}</span>
            </div>
            <Slider value={[settings.maxReplyLength]} onValueChange={([val]) => onUpdateSettings({ maxReplyLength: val })} min={50} max={500} step={10} className="w-full" />
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-medium">Category Auto-Reply Settings</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">Toggle categories between auto-reply and flag for review</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 cursor-pointer hover:bg-accent/50 transition-colors">
                  <Checkbox checked={settings.autoReplyCategories.includes(cat)} onCheckedChange={() => handleAutoReplyCategoryToggle(cat)} />
                  <Badge variant="outline" className={`text-[10px] ${getCategoryColor(cat)}`}>{cat}</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {settings.autoReplyCategories.includes(cat) ? 'Auto' : 'Flag'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <RiLinkedinBoxFill className="w-4 h-4 text-[#0A66C2]" />
            <h3 className="font-semibold text-sm text-foreground">LinkedIn Connection</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Real-time connection status with your LinkedIn account</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              connectionState.status === 'connected' ? 'bg-emerald-50 border-emerald-200' :
              connectionState.status === 'disconnected' ? 'bg-red-50 border-red-200' :
              'bg-amber-50 border-amber-200'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${
                connectionState.status === 'connected' ? 'bg-emerald-500' :
                connectionState.status === 'disconnected' ? 'bg-red-500' :
                'bg-amber-400 animate-pulse'
              }`} />
              <span className={`text-sm font-medium ${
                connectionState.status === 'connected' ? 'text-emerald-700' :
                connectionState.status === 'disconnected' ? 'text-red-700' :
                'text-amber-700'
              }`}>
                {connectionState.status === 'connected' ? 'Connected' :
                 connectionState.status === 'disconnected' ? 'Disconnected' :
                 connectionState.status === 'reconnecting' ? 'Reconnecting...' :
                 'Checking...'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {connectionState.status === 'connected'
                ? 'Your LinkedIn account is connected and active'
                : connectionState.status === 'disconnected'
                ? 'Connection lost. Click reconnect to try again.'
                : 'Verifying connection status...'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="px-3 py-2.5 rounded-lg bg-secondary/50 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <p className={`text-xs font-semibold ${
                connectionState.status === 'connected' ? 'text-emerald-600' :
                connectionState.status === 'disconnected' ? 'text-red-600' :
                'text-amber-600'
              }`}>
                {connectionState.status === 'connected' ? 'Active' :
                 connectionState.status === 'disconnected' ? 'Offline' : 'Pending'}
              </p>
            </div>
            <div className="px-3 py-2.5 rounded-lg bg-secondary/50 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Latency</p>
              <p className="text-xs font-semibold text-foreground font-mono">
                {connectionState.latency !== null ? `${connectionState.latency}ms` : '--'}
              </p>
            </div>
            <div className="px-3 py-2.5 rounded-lg bg-secondary/50 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last Check</p>
              <p className="text-xs font-semibold text-foreground">
                {connectionState.lastChecked
                  ? connectionState.lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '--'}
              </p>
            </div>
            <div className="px-3 py-2.5 rounded-lg bg-secondary/50 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Uptime</p>
              <p className="text-xs font-semibold text-foreground">
                {connectionState.uptime > 0 ? (
                  connectionState.uptime < 60 ? `${connectionState.uptime}s` :
                  connectionState.uptime < 3600 ? `${Math.floor(connectionState.uptime / 60)}m` :
                  `${Math.floor(connectionState.uptime / 3600)}h ${Math.floor((connectionState.uptime % 3600) / 60)}m`
                ) : '--'}
              </p>
            </div>
          </div>

          {connectionState.status === 'disconnected' && (
            <Button variant="outline" size="sm" onClick={onReconnect} className="gap-2">
              <RiRefreshLine className="w-4 h-4" />
              Reconnect
            </Button>
          )}
        </div>
      </GlassCard>

      <Button onClick={onSave} className="w-full sm:w-auto px-8">
        <RiSaveLine className="w-4 h-4 mr-2" />
        Save Settings
      </Button>
    </div>
  )
}

// ---- Main Page ----

export default function Page() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sampleMode, setSampleMode] = useState(false)

  const [stats, setStats] = useState<Stats>({ totalMessages: 0, autoReplied: 0, flagged: 0, pending: 0 })
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [flaggedMessages, setFlaggedMessages] = useState<FlaggedMessage[]>([])
  const [replyHistory, setReplyHistory] = useState<AutoReply[]>([])
  const [selectedFlaggedMessage, setSelectedFlaggedMessage] = useState<FlaggedMessage | null>(null)
  const [draftReply, setDraftReply] = useState('')
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const [statusMessage, setStatusMessage] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Real-time LinkedIn connection monitoring
  const { connectionState, manualReconnect } = useLinkedInConnection()

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('autotask-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('autotask-settings', JSON.stringify(settings))
      setStatusMessage({ message: 'Settings saved successfully', type: 'success' })
    } catch {
      setStatusMessage({ message: 'Failed to save settings', type: 'error' })
    }
  }, [settings])

  const dismissStatus = useCallback(() => {
    setStatusMessage(null)
  }, [])

  // Auto-dismiss status after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [statusMessage])

  const handleScanAndReply = useCallback(async () => {
    setIsScanning(true)
    setActiveAgentId(AGENT_SCAN_ID)
    setStatusMessage(null)
    try {
      const message = `
Profile Context:
Name: ${settings.name || 'User'}
Title: ${settings.title || 'Professional'}
Industry: ${settings.industry || 'Technology'}
Company: ${settings.company || 'My Company'}
Skills: ${settings.skills.length > 0 ? settings.skills.join(', ') : 'General'}
Open To: ${settings.openTo.length > 0 ? settings.openTo.join(', ') : 'Networking'}

Reply Preferences:
Tone: ${settings.tone}
Max Length: ${settings.maxReplyLength} words
Auto-reply categories: ${settings.autoReplyCategories.join(', ')}
Flag categories: ${settings.flagCategories.join(', ')}

Please scan my LinkedIn inbox, categorize all unread messages, auto-reply to safe categories, and flag sensitive/spam messages for my review.
`
      const result = await callAIAgent(message, AGENT_SCAN_ID)
      if (result.success && result?.response?.result) {
        const data = result.response.result
        const summary = data?.summary || { total_processed: 0, auto_replied: 0, flagged: 0 }
        const autoReplies = Array.isArray(data?.auto_replies) ? data.auto_replies : []
        const flagged = Array.isArray(data?.flagged_messages) ? data.flagged_messages : []
        const feed = Array.isArray(data?.activity_feed) ? data.activity_feed : []

        setStats((prev) => ({
          totalMessages: prev.totalMessages + (summary?.total_processed || 0),
          autoReplied: prev.autoReplied + (summary?.auto_replied || 0),
          flagged: prev.flagged + (summary?.flagged || 0),
          pending: Math.max(0, prev.pending - (summary?.total_processed || 0)),
        }))
        setFlaggedMessages((prev) => [...flagged, ...prev])
        setReplyHistory((prev) => [
          ...autoReplies.map((r: AutoReply) => ({ ...r, status: 'Auto' as const })),
          ...prev,
        ])
        setActivityFeed((prev) => [...feed, ...prev].slice(0, 50))

        const totalProcessed = summary?.total_processed || 0
        const autoRepliedCount = summary?.auto_replied || 0
        const flaggedCount = summary?.flagged || 0
        setStatusMessage({
          message: `Scan complete: ${totalProcessed} messages processed, ${autoRepliedCount} auto-replied, ${flaggedCount} flagged for review`,
          type: 'success',
        })
      } else {
        const errorMsg = result?.error || result?.response?.message || 'Unknown error occurred'
        setStatusMessage({ message: `Scan failed: ${errorMsg}`, type: 'error' })
      }
    } catch (err) {
      console.error('Scan failed:', err)
      setStatusMessage({ message: 'Scan failed: Network or server error', type: 'error' })
    } finally {
      setIsScanning(false)
      setActiveAgentId(null)
    }
  }, [settings])

  const handleDraftResponse = useCallback(async (flaggedMsg: FlaggedMessage) => {
    setIsDrafting(true)
    setActiveAgentId(AGENT_DRAFT_ID)
    setDraftReply('')
    setDraftMeta(null)
    try {
      const message = `
Profile Context:
Name: ${settings.name || 'User'}
Title: ${settings.title || 'Professional'}
Industry: ${settings.industry || 'Technology'}
Company: ${settings.company || 'My Company'}

Flagged Message:
From: ${flaggedMsg.sender_name} (${flaggedMsg.sender_title})
Category: ${flaggedMsg.category}
Flag Reason: ${flaggedMsg.flag_reason}
Priority: ${flaggedMsg.priority}
Message: ${flaggedMsg.original_message}

Please generate a suggested reply for this flagged LinkedIn message. Tone preference: ${settings.tone}
`
      const result = await callAIAgent(message, AGENT_DRAFT_ID)
      if (result.success && result?.response?.result) {
        const data = result.response.result
        setDraftReply(data?.suggested_reply || '')
        setDraftMeta({
          tone: data?.reply_tone || '',
          analysis: data?.context_analysis || '',
          confidence: data?.confidence || 0,
          alternatives: Array.isArray(data?.alternative_actions) ? data.alternative_actions : [],
          category: data?.category || '',
        })
      } else {
        const errorMsg = result?.error || result?.response?.message || 'Unknown error occurred'
        setStatusMessage({ message: `Draft failed: ${errorMsg}`, type: 'error' })
      }
    } catch (err) {
      console.error('Draft failed:', err)
      setStatusMessage({ message: 'Draft failed: Network or server error', type: 'error' })
    } finally {
      setIsDrafting(false)
      setActiveAgentId(null)
    }
  }, [settings])

  const handleSendReply = useCallback(() => {
    if (!selectedFlaggedMessage || !draftReply.trim()) return

    const newReply: AutoReply = {
      sender_name: selectedFlaggedMessage.sender_name,
      sender_title: selectedFlaggedMessage.sender_title,
      category: selectedFlaggedMessage.category,
      original_message: selectedFlaggedMessage.original_message,
      generated_reply: draftReply,
      timestamp: 'Just now',
      status: 'Manual',
    }

    setReplyHistory((prev) => [newReply, ...prev])
    setFlaggedMessages((prev) => prev.filter((m) => m !== selectedFlaggedMessage))
    setStats((prev) => ({
      ...prev,
      flagged: Math.max(0, prev.flagged - 1),
      autoReplied: prev.autoReplied + 1,
    }))
    setActivityFeed((prev) => [
      {
        action: 'Manually replied',
        sender_name: selectedFlaggedMessage.sender_name,
        category: selectedFlaggedMessage.category,
        timestamp: 'Just now',
      },
      ...prev,
    ].slice(0, 50))

    setSelectedFlaggedMessage(null)
    setDraftReply('')
    setDraftMeta(null)
    setStatusMessage({ message: `Reply sent to ${selectedFlaggedMessage.sender_name}`, type: 'success' })
  }, [selectedFlaggedMessage, draftReply])

  const handleDismiss = useCallback(() => {
    if (!selectedFlaggedMessage) return

    setFlaggedMessages((prev) => prev.filter((m) => m !== selectedFlaggedMessage))
    setStats((prev) => ({ ...prev, flagged: Math.max(0, prev.flagged - 1) }))
    setActivityFeed((prev) => [
      {
        action: 'Dismissed',
        sender_name: selectedFlaggedMessage.sender_name,
        category: selectedFlaggedMessage.category,
        timestamp: 'Just now',
      },
      ...prev,
    ].slice(0, 50))

    setSelectedFlaggedMessage(null)
    setDraftReply('')
    setDraftMeta(null)
    setStatusMessage({ message: `Message from ${selectedFlaggedMessage.sender_name} dismissed`, type: 'info' })
  }, [selectedFlaggedMessage])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardScreen
            stats={stats}
            activityFeed={activityFeed}
            isScanning={isScanning}
            onScanAndReply={handleScanAndReply}
            statusMessage={statusMessage}
            onDismissStatus={dismissStatus}
            sampleMode={sampleMode}
            connectionStatus={connectionState.status}
          />
        )
      case 'review':
        return (
          <ReviewQueueScreen
            flaggedMessages={flaggedMessages}
            selectedMessage={selectedFlaggedMessage}
            onSelectMessage={setSelectedFlaggedMessage}
            draftReply={draftReply}
            setDraftReply={setDraftReply}
            draftMeta={draftMeta}
            isDrafting={isDrafting}
            onDraftResponse={handleDraftResponse}
            onSendReply={handleSendReply}
            onDismiss={handleDismiss}
            statusMessage={statusMessage}
            onDismissStatus={dismissStatus}
            sampleMode={sampleMode}
          />
        )
      case 'history':
        return (
          <ReplyHistoryScreen
            replyHistory={replyHistory}
            sampleMode={sampleMode}
          />
        )
      case 'settings':
        return (
          <SettingsScreen
            settings={settings}
            onUpdateSettings={updateSettings}
            onSave={saveSettings}
            statusMessage={statusMessage}
            onDismissStatus={dismissStatus}
            connectionState={connectionState}
            onReconnect={manualReconnect}
          />
        )
      default:
        return null
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen font-sans" style={{ background: 'linear-gradient(135deg, hsl(210, 20%, 97%) 0%, hsl(220, 25%, 95%) 35%, hsl(200, 20%, 96%) 70%, hsl(230, 15%, 97%) 100%)' }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={(page) => { setCurrentPage(page); setStatusMessage(null) }}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((p) => !p)}
          flaggedCount={sampleMode ? SAMPLE_FLAGGED.length : flaggedMessages.length}
          connectionStatus={connectionState.status}
        />
        <TopHeader
          settings={settings}
          collapsed={sidebarCollapsed}
          connectionState={connectionState}
          onReconnect={manualReconnect}
        />

        <main className={`pt-16 min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
          <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-end mb-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground">Sample Data</Label>
                <Switch id="sample-toggle" checked={sampleMode} onCheckedChange={setSampleMode} />
              </div>
            </div>

            {renderPage()}
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
