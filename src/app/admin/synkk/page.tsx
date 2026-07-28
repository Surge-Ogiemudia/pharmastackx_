'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Container, CircularProgress, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Button, Tooltip, Select, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, InputAdornment, Alert, Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PlayArrow as TriggerIcon,
  Schedule as ScheduleIcon,
  OpenInNew as OpenIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckIcon,
  Cancel as FailIcon,
  HelpOutline as UnknownIcon,
  ContentCopy as CopyIcon,
  VisibilityOff as HideIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';

// ── Types ──────────────────────────────────────────────────────────────
interface SynkkMeta {
  posMethod?: string;
  posName?: string;
  posDomain?: string;
  authStatus?: string;
  authLastChecked?: string;
  extractionPath?: any[];
  cloudSyncSchedule?: string;
  lastSyncResult?: string;
}

interface PharmacyRow {
  _id: string;
  businessName: string;
  slug: string;
  lastSyncTime?: string;
  lastSyncTier?: number;
  appVersion?: string;
  hasCredentials: boolean;
  synkkMeta?: SynkkMeta;
  latestLog?: {
    result: string;
    timestamp: string;
    errorCode?: string;
    errorMessage?: string;
    itemsExtracted?: number;
  };
}

interface LogEntry {
  _id: string;
  syncId: string;
  timestamp: string;
  duration?: number;
  trigger: string;
  posMethod: string;
  posIdentifier: string;
  result: string;
  itemsExtracted?: number;
  itemsPushed?: number;
  errorCode?: string;
  errorMessage?: string;
  syncTier?: number;
  steps?: Array<{ time: string; action: string; detail: string; success: boolean }>;
  tierAttempts?: Array<{ tier: number; success: boolean; error?: string }>;
  networkLog?: Array<{ url: string; method: string; status: number; timestamp: string }>;
}

// ── Helpers ────────────────────────────────────────────────────────────
function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const methodColors: Record<string, string> = {
  web: '#0ea5e9',
  local_db: '#a855f7',
  csv: '#f59e0b',
};

const resultColors: Record<string, string> = {
  success: '#22c55e',
  partial: '#f59e0b',
  failed: '#ef4444',
};

// ── Main Page Component ───────────────────────────────────────────────
export default function SynkkAdminPage() {
  const [pharmacies, setPharmacies] = useState<PharmacyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Logs modal state
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsSlug, setLogsSlug] = useState('');
  const [logsName, setLogsName] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Path modal state
  const [pathOpen, setPathOpen] = useState(false);
  const [pathData, setPathData] = useState<any[]>([]);
  const [pathName, setPathName] = useState('');

  // Credentials modal state
  const [credsOpen, setCredsOpen] = useState(false);
  const [credsLoading, setCredsLoading] = useState(false);
  const [creds, setCreds] = useState<{ username: string; password: string; url: string } | null>(null);
  const [credsName, setCredsName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Schedule modal state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSlug, setScheduleSlug] = useState('');
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleValue, setScheduleValue] = useState('off');

  // Triggering sync state
  const [triggeringSlug, setTriggeringSlug] = useState<string | null>(null);

  // ── Fetch pharmacies ─────────────────────────────────────────────────
  const fetchPharmacies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/synkk-admin/pharmacies');
      setPharmacies(res.data.pharmacies || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load pharmacies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPharmacies(); }, [fetchPharmacies]);

  // ── Fetch logs ───────────────────────────────────────────────────────
  const openLogs = async (slug: string, name: string) => {
    setLogsSlug(slug);
    setLogsName(name);
    setLogsOpen(true);
    setLogsPage(1);
    setExpandedLog(null);
    await fetchLogs(slug, 1);
  };

  const fetchLogs = async (slug: string, page: number) => {
    setLogsLoading(true);
    try {
      const res = await axios.get(`/api/synkk-admin/logs?slug=${slug}&page=${page}&limit=15`);
      setLogs(res.data.logs || []);
      setLogsTotalPages(res.data.totalPages || 1);
      setLogsPage(res.data.page || 1);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // ── Open path viewer ─────────────────────────────────────────────────
  const openPath = (path: any[], name: string) => {
    setPathData(path || []);
    setPathName(name);
    setPathOpen(true);
  };

  // ── Open credentials (Manually Go In) ────────────────────────────────
  const openCreds = async (slug: string, name: string) => {
    setCredsName(name);
    setCredsOpen(true);
    setCredsLoading(true);
    setShowPassword(false);
    setCreds(null);
    try {
      const res = await axios.get(`/api/synkk-admin/credentials?slug=${slug}`);
      setCreds(res.data);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to decrypt credentials', severity: 'error' });
      setCredsOpen(false);
    } finally {
      setCredsLoading(false);
    }
  };

  // ── Set schedule ─────────────────────────────────────────────────────
  const openSchedule = (slug: string, name: string, current: string) => {
    setScheduleSlug(slug);
    setScheduleName(name);
    setScheduleValue(current || 'off');
    setScheduleOpen(true);
  };

  const saveSchedule = async () => {
    try {
      await axios.post('/api/synkk-admin/schedule', { slug: scheduleSlug, schedule: scheduleValue });
      setSnackbar({ open: true, message: `Sync schedule updated for ${scheduleName}`, severity: 'success' });
      setScheduleOpen(false);
      fetchPharmacies();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to update schedule', severity: 'error' });
    }
  };

  // ── Trigger sync ─────────────────────────────────────────────────────
  const triggerSync = async (slug: string) => {
    setTriggeringSlug(slug);
    try {
      await axios.post('/api/synkk-admin/trigger', { slug });
      setSnackbar({ open: true, message: `Cloud sync triggered for ${slug}`, severity: 'success' });
      fetchPharmacies();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Trigger sync failed', severity: 'error' });
    } finally {
      setTriggeringSlug(null);
    }
  };

  // ── Copy to clipboard ────────────────────────────────────────────────
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ open: true, message: `${label} copied to clipboard`, severity: 'success' });
  };

  // ── Filter pharmacies ────────────────────────────────────────────────
  const filtered = pharmacies.filter(p =>
    !search || 
    p.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    p.slug?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#10b981' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
            ⚡ Synkk Command Center
          </Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5 }}>
            {pharmacies.length} pharmacies connected · Real-time telemetry & sync control
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search pharmacies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} /></InputAdornment>,
              sx: { bgcolor: '#1e293b', borderRadius: 2, color: '#fff', '& fieldset': { borderColor: '#334155' } }
            }}
          />
          <Button
            onClick={fetchPharmacies}
            startIcon={<RefreshIcon />}
            sx={{ bgcolor: '#1e293b', color: '#10b981', borderRadius: 2, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#334155' } }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Main Table */}
      <TableContainer component={Paper} sx={{ bgcolor: '#0f172a', borderRadius: 3, border: '1px solid #1e293b', overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { color: '#94a3b8', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #1e293b', py: 1.5 } }}>
              <TableCell>S/N</TableCell>
              <TableCell>Pharmacy</TableCell>
              <TableCell>Subdomain</TableCell>
              <TableCell>POS Method</TableCell>
              <TableCell>POS Name</TableCell>
              <TableCell>POS Domain</TableCell>
              <TableCell align="center">Auth</TableCell>
              <TableCell>Path</TableCell>
              <TableCell>Last Sync</TableCell>
              <TableCell>Result</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ color: '#64748b', py: 6 }}>
                  {search ? 'No pharmacies match your search' : 'No pharmacies with Synkk data found'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p, idx) => {
                const meta = p.synkkMeta || {};
                const isWebPOS = meta.posMethod === 'web';
                const isTriggerDisabled = !isWebPOS || triggeringSlug === p.slug;

                return (
                  <TableRow key={p._id} sx={{ '& td': { borderBottom: '1px solid #1e293b', py: 1.2, color: '#e2e8f0', fontSize: '0.82rem' }, '&:hover': { bgcolor: '#1e293b40' } }}>
                    <TableCell sx={{ color: '#64748b', fontWeight: 600 }}>{idx + 1}</TableCell>
                    
                    <TableCell sx={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.businessName || 'Unnamed'}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={`${p.slug}.psx.ng`}
                        size="small"
                        component="a"
                        href={`https://${p.slug}.psx.ng`}
                        target="_blank"
                        clickable
                        sx={{ bgcolor: '#10b98120', color: '#10b981', fontWeight: 600, fontSize: '0.72rem', fontFamily: 'monospace' }}
                      />
                    </TableCell>

                    <TableCell>
                      {meta.posMethod ? (
                        <Chip
                          label={meta.posMethod === 'web' ? 'Web POS' : meta.posMethod === 'local_db' ? 'Local DB' : 'CSV'}
                          size="small"
                          sx={{ bgcolor: `${methodColors[meta.posMethod] || '#64748b'}20`, color: methodColors[meta.posMethod] || '#64748b', fontWeight: 600, fontSize: '0.7rem' }}
                        />
                      ) : (
                        <Typography sx={{ color: '#475569', fontSize: '0.75rem' }}>—</Typography>
                      )}
                    </TableCell>

                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta.posName || '—'}
                    </TableCell>

                    <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {meta.posDomain ? (
                        <Tooltip title={meta.posDomain}>
                          <Typography component="a" href={`https://${meta.posDomain}`} target="_blank" sx={{ color: '#0ea5e9', fontSize: '0.78rem', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                            {meta.posDomain}
                          </Typography>
                        </Tooltip>
                      ) : '—'}
                    </TableCell>

                    <TableCell align="center">
                      {p.hasCredentials ? (
                        meta.authStatus === 'valid' ? <CheckIcon sx={{ color: '#22c55e', fontSize: 20 }} /> :
                        meta.authStatus === 'invalid' ? <FailIcon sx={{ color: '#ef4444', fontSize: 20 }} /> :
                        <UnknownIcon sx={{ color: '#64748b', fontSize: 20 }} />
                      ) : (
                        <Typography sx={{ color: '#475569', fontSize: '0.7rem' }}>No creds</Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      {meta.extractionPath && meta.extractionPath.length > 0 ? (
                        <Button size="small" onClick={() => openPath(meta.extractionPath!, p.businessName || p.slug)} sx={{ color: '#a855f7', textTransform: 'none', fontSize: '0.72rem', fontWeight: 600, minWidth: 0, p: '2px 8px' }}>
                          View ({meta.extractionPath.length})
                        </Button>
                      ) : (
                        <Typography sx={{ color: '#475569', fontSize: '0.75rem' }}>—</Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Tooltip title={p.lastSyncTime ? new Date(p.lastSyncTime).toLocaleString() : 'Never synced'}>
                        <Typography sx={{ fontSize: '0.78rem', color: p.lastSyncTime ? '#cbd5e1' : '#475569' }}>
                          {timeAgo(p.lastSyncTime)}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    <TableCell>
                      {meta.lastSyncResult ? (
                        <Chip
                          label={meta.lastSyncResult}
                          size="small"
                          sx={{ bgcolor: `${resultColors[meta.lastSyncResult] || '#64748b'}20`, color: resultColors[meta.lastSyncResult] || '#64748b', fontWeight: 700, fontSize: '0.68rem', textTransform: 'capitalize' }}
                        />
                      ) : (
                        <Typography sx={{ color: '#475569', fontSize: '0.75rem' }}>—</Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Tooltip title={isWebPOS ? 'Trigger Cloud Sync' : 'Only available for Web POS'}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={isTriggerDisabled}
                              onClick={() => triggerSync(p.slug)}
                              sx={{ color: isTriggerDisabled ? '#334155' : '#10b981', '&:hover': { bgcolor: '#10b98120' } }}
                            >
                              {triggeringSlug === p.slug ? <CircularProgress size={16} sx={{ color: '#10b981' }} /> : <TriggerIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Set Sync Schedule">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!isWebPOS}
                              onClick={() => openSchedule(p.slug, p.businessName || p.slug, meta.cloudSyncSchedule || 'off')}
                              sx={{ color: !isWebPOS ? '#334155' : '#f59e0b', '&:hover': { bgcolor: '#f59e0b20' } }}
                            >
                              <ScheduleIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Manually Go In (with credentials)">
                          <span>
                            <IconButton
                              size="small"
                              disabled={!p.hasCredentials}
                              onClick={() => openCreds(p.slug, p.businessName || p.slug)}
                              sx={{ color: !p.hasCredentials ? '#334155' : '#0ea5e9', '&:hover': { bgcolor: '#0ea5e920' } }}
                            >
                              <OpenIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="View Sync Logs">
                          <IconButton
                            size="small"
                            onClick={() => openLogs(p.slug, p.businessName || p.slug)}
                            sx={{ color: '#a855f7', '&:hover': { bgcolor: '#a855f720' } }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Logs Modal ──────────────────────────────────────────────────── */}
      <Dialog open={logsOpen} onClose={() => setLogsOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { bgcolor: '#0f172a', color: '#e2e8f0', borderRadius: 3, border: '1px solid #1e293b' } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #1e293b' }}>
          Sync Logs — {logsName}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {logsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress sx={{ color: '#10b981' }} /></Box>
          ) : logs.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 6, color: '#64748b' }}>No sync logs recorded yet</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: '#94a3b8', fontWeight: 700, fontSize: '0.7rem', borderBottom: '1px solid #1e293b' } }}>
                  <TableCell></TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Trigger</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Tier</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Result</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <>
                    <TableRow
                      key={log._id}
                      onClick={() => setExpandedLog(expandedLog === log._id ? null : log._id)}
                      sx={{ cursor: 'pointer', '& td': { borderBottom: '1px solid #1e293b', color: '#cbd5e1', fontSize: '0.8rem' }, '&:hover': { bgcolor: '#1e293b60' } }}
                    >
                      <TableCell sx={{ width: 30 }}>
                        <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>{expandedLog === log._id ? '▼' : '▶'}</Typography>
                      </TableCell>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell><Chip label={log.trigger} size="small" sx={{ fontSize: '0.65rem', bgcolor: '#334155', color: '#94a3b8' }} /></TableCell>
                      <TableCell>{log.posMethod}</TableCell>
                      <TableCell>{log.syncTier ?? '—'}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#10b981' }}>{log.itemsExtracted ?? '—'}</TableCell>
                      <TableCell>{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.result}
                          size="small"
                          sx={{ bgcolor: `${resultColors[log.result] || '#64748b'}20`, color: resultColors[log.result] || '#64748b', fontWeight: 700, fontSize: '0.65rem', textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#ef4444', fontSize: '0.72rem' }}>
                        {log.errorMessage || '—'}
                      </TableCell>
                    </TableRow>
                    {expandedLog === log._id && (
                      <TableRow key={`${log._id}-detail`}>
                        <TableCell colSpan={9} sx={{ bgcolor: '#0c111b', p: 2, borderBottom: '1px solid #1e293b' }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#10b981', mb: 1 }}>Step-by-Step Telemetry</Typography>
                          <Box sx={{ maxHeight: 300, overflow: 'auto', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                            {log.steps && log.steps.length > 0 ? log.steps.map((step, i) => (
                              <Box key={i} sx={{ display: 'flex', gap: 1.5, py: 0.4, borderBottom: '1px solid #1e293b30' }}>
                                <Typography sx={{ color: '#475569', fontSize: '0.65rem', minWidth: 60 }}>
                                  {new Date(step.time).toLocaleTimeString()}
                                </Typography>
                                <Typography sx={{ color: step.success ? '#22c55e' : '#ef4444', fontSize: '0.72rem', minWidth: 8 }}>
                                  {step.success ? '✓' : '✗'}
                                </Typography>
                                <Typography sx={{ color: '#0ea5e9', fontWeight: 600, fontSize: '0.72rem', minWidth: 180 }}>
                                  {step.action}
                                </Typography>
                                <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                  {step.detail}
                                </Typography>
                              </Box>
                            )) : (
                              <Typography sx={{ color: '#475569', fontSize: '0.72rem' }}>No step telemetry available for this sync</Typography>
                            )}
                          </Box>

                          {log.tierAttempts && log.tierAttempts.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#f59e0b', mb: 1 }}>Tier Attempts</Typography>
                              {log.tierAttempts.map((t, i) => (
                                <Typography key={i} sx={{ fontSize: '0.72rem', color: t.success ? '#22c55e' : '#ef4444' }}>
                                  Tier {t.tier}: {t.success ? 'Success' : `Failed — ${t.error || 'Unknown'}`}
                                </Typography>
                              ))}
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #1e293b', justifyContent: 'space-between', px: 3 }}>
          <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>Page {logsPage} of {logsTotalPages}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button disabled={logsPage <= 1} onClick={() => fetchLogs(logsSlug, logsPage - 1)} sx={{ color: '#94a3b8', textTransform: 'none' }}>Previous</Button>
            <Button disabled={logsPage >= logsTotalPages} onClick={() => fetchLogs(logsSlug, logsPage + 1)} sx={{ color: '#94a3b8', textTransform: 'none' }}>Next</Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* ── Path Viewer Modal ───────────────────────────────────────────── */}
      <Dialog open={pathOpen} onClose={() => setPathOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { bgcolor: '#0f172a', color: '#e2e8f0', borderRadius: 3, border: '1px solid #1e293b' } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #1e293b' }}>
          Extraction Path — {pathName}
        </DialogTitle>
        <DialogContent>
          {pathData.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 4, color: '#64748b' }}>No path recorded</Typography>
          ) : (
            <Box sx={{ mt: 2 }}>
              {pathData.map((step, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: '1px solid #1e293b30', alignItems: 'flex-start' }}>
                  <Chip label={i + 1} size="small" sx={{ bgcolor: '#334155', color: '#94a3b8', fontWeight: 700, minWidth: 28 }} />
                  <Chip label={step.action} size="small" sx={{ bgcolor: '#0ea5e920', color: '#0ea5e9', fontWeight: 600, fontSize: '0.7rem' }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{step.label || step.action}</Typography>
                    {step.url && <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>{step.url}</Typography>}
                    {step.selector && <Typography sx={{ fontSize: '0.72rem', color: '#a855f7', fontFamily: 'monospace' }}>{step.selector}</Typography>}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #1e293b' }}>
          <Button onClick={() => setPathOpen(false)} sx={{ color: '#94a3b8', textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Credentials Modal (Manually Go In) ──────────────────────────── */}
      <Dialog open={credsOpen} onClose={() => setCredsOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { bgcolor: '#0f172a', color: '#e2e8f0', borderRadius: 3, border: '1px solid #1e293b' } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #1e293b' }}>
          🔐 Manually Go In — {credsName}
        </DialogTitle>
        <DialogContent>
          {credsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress sx={{ color: '#10b981' }} /></Box>
          ) : creds ? (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3, bgcolor: '#0ea5e910', color: '#0ea5e9', '& .MuiAlert-icon': { color: '#0ea5e9' } }}>
                Click &quot;Open POS&quot; to open the login page, then use the credentials below to log in.
              </Alert>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mb: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>POS URL</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#0ea5e9', flex: 1 }}>{creds.url}</Typography>
                  <IconButton size="small" onClick={() => copyToClipboard(creds.url, 'URL')} sx={{ color: '#64748b' }}><CopyIcon fontSize="small" /></IconButton>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mb: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Username</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem', flex: 1, bgcolor: '#1e293b', px: 1.5, py: 0.8, borderRadius: 1 }}>{creds.username}</Typography>
                  <IconButton size="small" onClick={() => copyToClipboard(creds.username, 'Username')} sx={{ color: '#64748b' }}><CopyIcon fontSize="small" /></IconButton>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mb: 0.5, textTransform: 'uppercase', fontWeight: 700 }}>Password</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem', flex: 1, bgcolor: '#1e293b', px: 1.5, py: 0.8, borderRadius: 1 }}>
                    {showPassword ? creds.password : '••••••••••••'}
                  </Typography>
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)} sx={{ color: '#64748b' }}>
                    {showPassword ? <HideIcon fontSize="small" /> : <ViewIcon fontSize="small" />}
                  </IconButton>
                  <IconButton size="small" onClick={() => copyToClipboard(creds.password, 'Password')} sx={{ color: '#64748b' }}><CopyIcon fontSize="small" /></IconButton>
                </Box>
              </Box>

              <Button
                fullWidth
                variant="contained"
                startIcon={<OpenIcon />}
                onClick={() => window.open(creds.url.startsWith('http') ? creds.url : `https://${creds.url}`, '_blank')}
                sx={{ bgcolor: '#10b981', color: '#fff', fontWeight: 700, textTransform: 'none', borderRadius: 2, py: 1.2, '&:hover': { bgcolor: '#059669' } }}
              >
                Open POS Login Page
              </Button>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #1e293b' }}>
          <Button onClick={() => setCredsOpen(false)} sx={{ color: '#94a3b8', textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Schedule Modal ──────────────────────────────────────────────── */}
      <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: '#0f172a', color: '#e2e8f0', borderRadius: 3, border: '1px solid #1e293b' } }}>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #1e293b' }}>
          ⏰ Set Sync Schedule — {scheduleName}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Select
              fullWidth
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
              sx={{ bgcolor: '#1e293b', color: '#fff', borderRadius: 2, '& fieldset': { borderColor: '#334155' }, '& .MuiSelect-icon': { color: '#64748b' } }}
            >
              <MenuItem value="6h">Every 6 hours</MenuItem>
              <MenuItem value="12h">Every 12 hours</MenuItem>
              <MenuItem value="24h">Once daily</MenuItem>
              <MenuItem value="off">Off (Manual only)</MenuItem>
            </Select>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #1e293b' }}>
          <Button onClick={() => setScheduleOpen(false)} sx={{ color: '#94a3b8', textTransform: 'none' }}>Cancel</Button>
          <Button onClick={saveSchedule} sx={{ bgcolor: '#10b981', color: '#fff', textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#059669' } }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} sx={{ bgcolor: snackbar.severity === 'success' ? '#10b98120' : '#ef444420', color: snackbar.severity === 'success' ? '#10b981' : '#ef4444' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
