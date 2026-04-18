"use client";
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField, IconButton, Switch } from "@mui/material";
import { Add, Delete, Save } from "@mui/icons-material";

export default function AICommandCentreContent() {
  const [activeTab, setActiveTab] = useState<'audit' | 'tuning' | 'rules'>('audit');
  
  // Settings State
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Audit State
  const [consultations, setConsultations] = useState<any[]>([]);
  const [auditing, setAuditing] = useState(false);
  const [expandedChat, setExpandedChat] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchConsultations();
  }, []);

  useEffect(() => {
    if (activeTab !== 'audit') return;
    const interval = setInterval(fetchConsultations, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/ai/settings');
      if (res.ok) {
        setSettings(await res.json());
        setSettingsError(false);
      } else {
        setSettingsError(true);
      }
    } catch (e) {
      console.error(e);
      setSettingsError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultations = async () => {
    setAuditing(true);
    try {
      const res = await fetch('/api/admin/ai/consultations?limit=30');
      if (res.ok) {
        setConsultations(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuditing(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setMsg("");
    try {
      const payload = {
        ...settings,
        goldenRules: (settings?.goldenRules || []).filter(
          (r: any) => r.input?.trim() && r.output?.trim()
        )
      };
      const res = await fetch('/api/admin/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setSettings(saved);
        setMsg("Settings saved.");
        setTimeout(() => setMsg(""), 3000);
      } else {
        setMsg("Failed to save. Please try again.");
      }
    } catch (e) {
      setMsg("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    if (!settings) return;
    const newRule = { input: '', output: '', label: 'New Rule' };
    setSettings((prev: any) => ({
      ...prev,
      goldenRules: [...(prev?.goldenRules || []), newRule]
    }));
  };

  const updateRule = (index: number, field: string, value: string) => {
    if (!settings?.goldenRules) return;
    const rules = [...settings.goldenRules];
    rules[index] = { ...rules[index], [field]: value };
    setSettings({ ...settings, goldenRules: rules });
  };

  const removeRule = (index: number) => {
    if (!settings?.goldenRules) return;
    const rules = settings.goldenRules.filter((_: any, i: number) => i !== index);
    setSettings({ ...settings, goldenRules: rules });
  };

  const btnStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    background: active ? '#0F6E56' : 'transparent',
    color: active ? '#fff' : '#666',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: 'Sora, sans-serif',
    transition: 'all 0.2s ease',
  });

  if (loading) return <Box sx={{ p: 4, textAlign: 'center', color: '#888' }}>Loading Command Centre...</Box>;

  if (settingsError) return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography sx={{ color: '#d32f2f', fontWeight: 600, mb: 1 }}>Failed to load AI settings.</Typography>
      <Button onClick={() => { setLoading(true); fetchSettings(); }} variant="outlined" size="small" sx={{ borderColor: '#0F6E56', color: '#0F6E56' }}>
        Retry
      </Button>
    </Box>
  );

  return (
    <Box sx={{ fontFamily: 'Sora, sans-serif', pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: '32px' }}>🧠</span>
        <Box>
          <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a' }}>AI Command Centre</Typography>
          <Typography sx={{ fontSize: '13px', color: '#888' }}>Supervise, train, and control the PharmaStackX AI ecosystem.</Typography>
        </Box>
        {msg && (
          <Typography sx={{ ml: 'auto', fontSize: '12px', color: '#0F6E56', bgcolor: 'rgba(15,110,86,0.1)', px: 2, py: 0.5, borderRadius: '12px' }}>
            ✓ {msg}
          </Typography>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 1, bgcolor: 'rgba(0,0,0,0.04)', p: '4px', borderRadius: '24px', mb: 3 }}>
        <button style={btnStyle(activeTab === 'audit')} onClick={() => setActiveTab('audit')}>🧐 Conversational Audit</button>
        <button style={btnStyle(activeTab === 'rules')} onClick={() => setActiveTab('rules')}>✨ Golden Rules</button>
        <button style={btnStyle(activeTab === 'tuning')} onClick={() => setActiveTab('tuning')}>⚙️ Brain Tuning</button>
      </Box>

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <Box>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 700 }}>Recent Consultations</Typography>
              <Button
                  onClick={fetchConsultations}
                  disabled={auditing}
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: '#0F6E56', color: '#0F6E56', borderRadius: '8px', textTransform: 'none', fontSize: '12px', fontWeight: 600 }}
              >
                  {auditing ? 'Refreshing...' : '↻ Refresh'}
              </Button>
           </Box>
           {consultations.length === 0 ? (
             <Typography sx={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>No active or recent chats found.</Typography>
           ) : (
             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
               {consultations.map(c => (
                 <Box key={c._id} sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
                    <Box 
                      sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer', '&:hover': { bgcolor: 'rgba(15,110,86,0.04)' } }}
                      onClick={() => setExpandedChat(expandedChat === c._id ? null : c._id)}
                    >
                      <Box>
                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0F6E56' }}>User: {c.userId?.substring(0,6) || 'Anonymous'}</Typography>
                        <Typography sx={{ fontSize: '11px', color: '#888' }}>{new Date(c.updatedAt).toLocaleString()}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: '10px', background: c.status === 'escalated' ? '#FEF2F2' : '#F0FDF4', color: c.status === 'escalated' ? '#991B1B' : '#166534', padding: '4px 8px', borderRadius: '8px', fontWeight: 700 }}>
                          {c.status.toUpperCase()} ({c.messages.length} msgs)
                        </span>
                        <span style={{ color: '#888' }}>{expandedChat === c._id ? '▲' : '▼'}</span>
                      </Box>
                    </Box>

                    {expandedChat === c._id && (
                      <Box sx={{ p: 2, maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {c.messages.map((m: any, i: number) => (
                          <Box key={i} sx={{ display: 'flex', justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                            <Box sx={{ 
                              maxWidth: '80%', 
                              p: 1.5, 
                              borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              bgcolor: m.sender === 'user' ? '#0F6E56' : '#f1f1f1',
                              color: m.sender === 'user' ? '#fff' : '#333'
                            }}>
                              <Typography sx={{ fontSize: '10px', fontWeight: 700, opacity: 0.7, mb: 0.5 }}>{m.sender.toUpperCase()}</Typography>
                              <Typography sx={{ fontSize: '13px', lineHeight: 1.5 }}>{m.text}</Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                 </Box>
               ))}
             </Box>
           )}
        </Box>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '15px', fontWeight: 700 }}>Golden Rules</Typography>
              <Typography sx={{ fontSize: '12px', color: '#888' }}>Add clear Input/Output examples. The AI will study these before every chat.</Typography>
            </Box>
            <Button variant="contained" startIcon={<Add />} onClick={addRule} sx={{ bgcolor: '#0F6E56', '&:hover': { bgcolor: '#0B5E4A' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
              Add Rule
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(!settings?.goldenRules || settings.goldenRules.length === 0) && (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#fff', border: '1px dashed #ccc', borderRadius: '16px' }}>
                <Typography sx={{ color: '#888', fontSize: '13px' }}>No rules configured yet. The AI is relying entirely on its base prompt.</Typography>
              </Box>
            )}

            {settings?.goldenRules?.map((rule: any, i: number) => (
              <Box key={i} sx={{ p: 2, bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#0F6E56' }}>Rule #{i + 1}</Typography>
                  <IconButton size="small" onClick={() => removeRule(i)} sx={{ color: '#d32f2f' }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField 
                    label="If User Says (Input)" 
                    size="small" 
                    fullWidth 
                    value={rule.input}
                    onChange={(e) => updateRule(i, 'input', e.target.value)}
                    InputProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                    InputLabelProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                  />
                  <TextField 
                    label="AI Must Reply With (Output)" 
                    size="small" 
                    fullWidth 
                    multiline
                    rows={2}
                    value={rule.output}
                    onChange={(e) => updateRule(i, 'output', e.target.value)}
                    InputProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                    InputLabelProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
                  />
                </Box>
              </Box>
            ))}
          </Box>

          {settings?.goldenRules?.length > 0 && (
             <Button onClick={handleSaveSettings} disabled={saving} variant="contained" startIcon={<Save />} sx={{ mt: 3, bgcolor: '#0F6E56', '&:hover': { bgcolor: '#0B5E4A' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
                {saving ? 'Saving...' : 'Save All Rules'}
             </Button>
          )}
        </Box>
      )}

      {/* Tuning Tab */}
      {activeTab === 'tuning' && (
        <Box>
           <Box sx={{ mb: 3 }}>
             <Typography sx={{ fontSize: '15px', fontWeight: 700, mb: 1 }}>Master System Prompt</Typography>
             <Typography sx={{ fontSize: '12px', color: '#888', mb: 2 }}>This is the core identity of the AI. Be careful—changes here affect every chat.</Typography>
             <TextField
               fullWidth
               multiline
               rows={8}
               value={settings?.systemPrompt}
               onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
               InputProps={{ sx: { fontSize: '13px', fontFamily: 'monospace' } }}
               sx={{ bgcolor: '#fff' }}
             />
           </Box>

           <Box sx={{ mb: 3, p: 2, bgcolor: '#fff', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.08)' }}>
             <Typography sx={{ fontSize: '15px', fontWeight: 700, mb: 1 }}>Safety & Alerting</Typography>
             <Typography sx={{ fontSize: '12px', color: '#888', mb: 2 }}>Configure emergency email alerts if the AI hallucinates or faults.</Typography>
             
             <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
               <Switch 
                 checked={settings?.isAlertingEnabled || false} 
                 onChange={(e) => setSettings({ ...settings, isAlertingEnabled: e.target.checked })}
                 sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#0F6E56' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#0F6E56' } }}
               />
               <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>Enable Email Alerts</Typography>
             </Box>

             <TextField
               fullWidth
               size="small"
               label="Alert Email Address"
               value={settings?.alertEmail}
               onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })}
               disabled={!settings?.isAlertingEnabled}
               InputProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
               InputLabelProps={{ sx: { fontSize: '13px', fontFamily: 'Sora, sans-serif' } }}
             />
           </Box>

           <Button onClick={handleSaveSettings} disabled={saving} variant="contained" startIcon={<Save />} sx={{ bgcolor: '#0F6E56', '&:hover': { bgcolor: '#0B5E4A' }, borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>
              {saving ? 'Saving...' : 'Save Configuration'}
           </Button>
        </Box>
      )}

    </Box>
  );
}
