import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Chip, Avatar, Dialog, DialogContent, CircularProgress, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import { useSession } from '@/context/SessionProvider';

interface ActivityCardProps {
    title: string;
    sub: string;
    xp: string;
    color: 'green' | 'pink' | 'amber' | 'blue' | 'dark' | 'white';
    badge?: string;
    delay?: number;
    onClick?: () => void;
}

const ActivityCard = ({ title, sub, xp, color, badge, delay = 0, onClick }: ActivityCardProps) => {
    const colors = {
        green: { bg: 'var(--green-pale)', border: 'rgba(15, 110, 86, 0.15)', icon: 'rgba(15, 110, 86, 0.15)', text: 'var(--green)', dot: 'var(--green)' },
        pink: { bg: '#fdf0f6', border: 'rgba(200, 75, 143, 0.15)', icon: 'rgba(200, 75, 143, 0.15)', text: 'var(--pink)', dot: 'var(--pink)' },
        amber: { bg: '#FAEEDA', border: 'rgba(186, 117, 23, 0.15)', icon: 'rgba(186, 117, 23, 0.15)', text: 'var(--amber)', dot: 'var(--amber)' },
        blue: { bg: '#E6F1FB', border: 'rgba(24, 95, 165, 0.15)', icon: 'rgba(24, 95, 165, 0.15)', text: 'var(--blue)', dot: 'var(--blue)' },
        dark: { bg: '#111', border: 'rgba(255, 255, 255, 0.05)', icon: 'rgba(255, 255, 255, 0.08)', text: '#fff', dot: '#fff' },
        white: { bg: '#fff', border: 'rgba(0, 0, 0, 0.06)', icon: 'var(--green-pale)', text: 'var(--green)', dot: 'var(--green)' }
    };

    const c = colors[color];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + delay * 0.1 }}
            whileHover={{ y: -4 }}
            style={{ height: '100%' }}
            onClick={onClick}
        >
            <Box sx={{ 
                height: '100%',
                p: 2.5, 
                bgcolor: c.bg, 
                border: `1px solid ${c.border}`, 
                borderRadius: '24px',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {badge && (
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 12, 
                        right: 12, 
                        bgcolor: color === 'green' ? 'var(--green)' : 'var(--pink)', 
                        color: '#fff',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: '100px',
                        fontSize: '10px',
                        fontWeight: 800
                    }}>
                        {badge}
                    </Box>
                )}
                <Box sx={{ 
                    width: 42, 
                    height: 42, 
                    borderRadius: '12px', 
                    bgcolor: c.icon, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mb: 2 
                }}>
                    <Box sx={{ 
                        width: 16, 
                        height: 16, 
                        borderRadius: color === 'white' ? '50%' : '4px', 
                        border: `2px solid ${color === 'dark' ? 'rgba(255,255,255,0.4)' : c.text}` 
                    }} />
                </Box>
                <Typography className="sora" sx={{ fontWeight: 800, fontSize: '14px', color: color === 'dark' ? '#fff' : 'var(--black)', mb: 1, lineHeight: 1.2 }}>
                    {title}
                </Typography>
                <Typography variant="caption" sx={{ color: color === 'dark' ? 'rgba(255,255,255,0.4)' : 'var(--gray)', mb: 2, lineHeight: 1.4, flexGrow: 1 }}>
                    {sub}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.dot }} />
                    <Typography sx={{ fontSize: '10px', fontWeight: 800, color: c.text }}>
                        {xp}
                    </Typography>
                </Box>
            </Box>
        </motion.div>
    );
};

const QuizModal = ({ open, type, onClose, onComplete }: { open: boolean, type: 'pharmacist' | 'patient', onClose: () => void, onComplete: (xpEarned: number) => void }) => {
    const [difficulty, setDifficulty] = useState<'easy' | 'hard' | 'exceptional' | null>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setDifficulty(null);
            setLoading(false);
            setFinished(false);
            setCurrentIdx(0);
            setScore(0);
            setSelectedAnswer(null);
        }
    }, [open]);

    const handleStart = (diff: 'easy' | 'hard' | 'exceptional') => {
        setDifficulty(diff);
        setLoading(true);
        fetch(`/api/learning/quiz?difficulty=${diff}&type=${type}`)
            .then(r => r.json())
            .then(data => {
                setQuestions(data);
                setLoading(false);
            });
    };

    const handleSelect = (idx: number) => {
        if (isChecking) return;
        setSelectedAnswer(idx);
        setIsChecking(true);

        const correct = idx === questions[currentIdx].correctIndex;
        if (correct) setScore(s => s + 1);

        setTimeout(() => {
            if (currentIdx < questions.length - 1) {
                setCurrentIdx(c => c + 1);
                setSelectedAnswer(null);
                setIsChecking(false);
            } else {
                setFinished(true);
            }
        }, 1500);
    };

    const handleFinish = async () => {
        const mult = difficulty === 'exceptional' ? 50 : difficulty === 'hard' ? 20 : 10;
        const xpEarned = score * mult; 
        if (xpEarned > 0) {
            await fetch('/api/learning/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ xpAdded: xpEarned })
            });
        }
        onComplete(xpEarned);
        onClose();
    };

    const getMultiplier = () => difficulty === 'exceptional' ? 50 : difficulty === 'hard' ? 20 : 10;

    return (
        <Dialog 
            open={open} 
            onClose={isChecking || finished ? undefined : onClose} 
            maxWidth="sm" 
            fullWidth 
            sx={{ zIndex: 9999 }}
            PaperProps={{ sx: { borderRadius: '32px', p: 0, overflow: 'hidden' } }}
        >
            {!difficulty ? (
                <Box sx={{ p: 6, textAlign: 'center' }} className="sora">
                    <Typography className="fraunces" variant="h4" sx={{ fontWeight: 900, mb: 1, color: 'var(--black)' }}>
                        {type === 'pharmacist' ? 'Clinical Difficulty' : 'Health Trivia'}
                    </Typography>
                    <Typography sx={{ color: 'var(--gray)', mb: 4, fontWeight: 300 }}>
                        {type === 'pharmacist' ? 'The harder the pharmacology questions, the higher the XP.' : 'Test your everyday health and wellness knowledge.'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[
                            { id: 'easy', label: 'Easy', xp: '10', color: 'var(--green)', bg: 'var(--green-pale)' },
                            { id: 'hard', label: 'Hard', xp: '20', color: 'var(--blue)', bg: 'var(--blue-pale)' },
                            { id: 'exceptional', label: 'Exceptional', xp: '50', color: 'var(--amber)', bg: 'var(--amber-pale)' }
                        ].map((d) => (
                            <Box 
                                key={d.id}
                                onClick={() => handleStart(d.id as any)}
                                sx={{ 
                                    p: 3, 
                                    borderRadius: '24px', 
                                    bgcolor: d.bg, 
                                    border: `1px solid ${d.color}20`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.2s',
                                    '&:hover': { transform: 'scale(1.02)', boxShadow: `0 8px 24px ${d.color}30` }
                                }}
                            >
                                <Typography sx={{ fontWeight: 800, fontSize: '18px', color: d.color, textTransform: 'capitalize' }}>{d.label}</Typography>
                                <Chip label={`+${d.xp} XP per question`} size="small" sx={{ bgcolor: '#fff', color: d.color, fontWeight: 800 }} />
                            </Box>
                        ))}
                    </Box>
                    <Button onClick={onClose} sx={{ mt: 4, color: 'var(--gray)', fontWeight: 700 }}>Cancel</Button>
                </Box>
            ) : loading ? (
                <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: 'var(--green)' }} /></Box>
            ) : finished ? (
                <Box sx={{ p: 6, textAlign: 'center', bgcolor: 'var(--green-pale)' }} className="sora">
                    <Typography className="fraunces" variant="h3" sx={{ color: 'var(--green)', fontWeight: 900, mb: 1 }}>{score}/{questions.length}</Typography>
                    <Typography sx={{ fontWeight: 800, mb: 4, color: 'var(--black)' }}>Quiz Completed!</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 4 }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', border: '3px solid var(--amber)' }} />
                        <Typography sx={{ color: 'var(--amber)', fontWeight: 900, fontSize: '18px' }}>+{score * getMultiplier()} XP Earned</Typography>
                    </Box>
                    <Button variant="contained" fullWidth onClick={handleFinish} sx={{ bgcolor: 'var(--green)', borderRadius: '100px', py: 2, fontWeight: 800, '&:hover': { bgcolor: '#0b5643' } }}>
                        Return to Activity Centre
                    </Button>
                </Box>
            ) : (
                <Box sx={{ p: 0 }} className="sora">
                    <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '12px', color: 'var(--gray)', letterSpacing: '2px' }}>
                            <Box component="span" sx={{ color: difficulty === 'exceptional' ? 'var(--amber)' : difficulty === 'hard' ? 'var(--blue)' : 'var(--green)', mr: 1, textTransform: 'uppercase' }}>{difficulty}</Box>
                            QUESTION {currentIdx + 1} OF {questions.length}
                        </Typography>
                        <IconButton onClick={onClose} size="small" disabled={isChecking}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                    <Box sx={{ p: 4, maxHeight: { xs: '65vh', sm: '75vh' }, overflowY: 'auto' }}>
                        <Typography className="fraunces" variant="h5" sx={{ fontWeight: 900, mb: 4, lineHeight: 1.3, color: 'var(--black)' }}>
                            {questions[currentIdx]?.question}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {questions[currentIdx]?.options.map((opt: string, idx: number) => {
                                const isSelected = selectedAnswer === idx;
                                const isCorrect = idx === questions[currentIdx].correctIndex;
                                let bgcolor = 'rgba(0,0,0,0.03)';
                                let border = '1px solid rgba(0,0,0,0)';
                                let color = 'var(--black)';

                                if (isChecking) {
                                    if (isSelected && !isCorrect) {
                                        bgcolor = '#fdf0f6'; border = '1px solid var(--pink)'; color = 'var(--pink)';
                                    } else if (isCorrect) {
                                        bgcolor = 'var(--green-pale)'; border = '1px solid var(--green)'; color = 'var(--green)';
                                    }
                                } else if (isSelected) {
                                    bgcolor = 'rgba(0,0,0,0.05)';
                                }

                                return (
                                    <Box 
                                        key={idx} 
                                        onClick={() => handleSelect(idx)}
                                        sx={{ 
                                            p: 2.5, 
                                            borderRadius: '20px', 
                                            bgcolor, 
                                            border,
                                            color,
                                            cursor: isChecking ? 'default' : 'pointer',
                                            fontWeight: 700,
                                            fontSize: '15px',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: isChecking ? bgcolor : 'rgba(0,0,0,0.06)' }
                                        }}
                                    >
                                        {opt}
                                    </Box>
                                );
                            })}
                        </Box>
                        {isChecking && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <Box sx={{ mt: 3, p: 2, borderRadius: '16px', bgcolor: 'rgba(0,0,0,0.03)' }}>
                                    <Typography sx={{ fontSize: '12px', fontWeight: 800, color: 'var(--gray)', mb: 1, textTransform: 'uppercase' }}>Explanation</Typography>
                                    <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--black)' }}>{questions[currentIdx]?.explanation}</Typography>
                                </Box>
                            </motion.div>
                        )}
                    </Box>
                </Box>
            )}
        </Dialog>
    );
};

const LearningContent = ({ onBack }: { onBack: () => void }) => {
    const { user } = useSession();
    const isCustomer = user?.role === 'customer';
    const [progress, setProgress] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [quizState, setQuizState] = useState<{ open: boolean, type: 'pharmacist' | 'patient' }>({ open: false, type: 'pharmacist' });

    const fetchProgress = async () => {
        try {
            const [progRes, leadRes] = await Promise.all([
                fetch('/api/learning/progress'),
                fetch(`/api/learning/leaderboard?role=${user?.role || 'customer'}`)
            ]);
            
            if (progRes.ok) {
                const progData = await progRes.json();
                setProgress(progData);
            }
            if (leadRes.ok) {
                const leadData = await leadRes.json();
                setLeaderboard(leadData);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (user) fetchProgress();
    }, [user]);

    const handleQuizComplete = (xp: number) => {
        if (xp > 0) fetchProgress(); // Refresh stats
    };

    if (loading) {
        return (
            <Box className="sora" sx={{ width: '100%', maxWidth: '900px', mx: 'auto', pt: { xs: 10, sm: 8 }, px: { xs: 2, sm: 4 }, pb: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                    <Box sx={{ width: 100, height: 20, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2 }} />
                    <Box sx={{ width: 80, height: 20, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2 }} />
                </Box>
                <Box sx={{ width: '60%', height: 60, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 4, mb: 4 }} />
                <Box sx={{ width: '100%', height: 120, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 6, mb: 6 }} />
                <Grid container spacing={2}>
                    {[1,2,3].map(i => (
                        <Grid item xs={6} sm={4} key={i}>
                            <Box sx={{ width: '100%', height: 160, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 6 }} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    return (
        <Box 
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sora" 
            sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                overflowY: 'auto',
                bgcolor: '#fafaf8',
                pt: { xs: 10, sm: 12 }, 
                px: { xs: 2, sm: 4 }, 
                pb: { xs: 12, sm: 8 } 
            }}
        >
            <style dangerouslySetInnerHTML={{ __html: `
                :root {
                    --green-pale: #E1F5EE;
                    --pink: #C84B8F;
                    --amber: #BA7517;
                    --amber-pale: #FAEEDA;
                    --blue: #185FA5;
                    --blue-pale: #E6F1FB;
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            ` }} />
            
            <QuizModal 
                open={quizState.open} 
                type={quizState.type}
                onClose={() => setQuizState({ ...quizState, open: false })} 
                onComplete={handleQuizComplete} 
            />

            <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
                {/* Top Bar */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box 
                        onClick={onBack} 
                        sx={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 1.5, 
                            cursor: 'pointer',
                            color: 'var(--black)',
                            '&:hover': { transform: 'translateX(-4px)' },
                            transition: 'all 0.2s'
                        }}
                    >
                        <Box sx={{ bgcolor: 'var(--green)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(15, 110, 86, 0.2)' }}>
                            <ArrowBackIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Typography sx={{ fontSize: '12px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase' }}>DASHBOARD</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'var(--amber-pale)', border: '1px solid rgba(186,117,23,0.1)', borderRadius: '100px', px: 2, py: 0.8 }}>
                        <Typography sx={{ fontSize: '16px' }}>🔥</Typography>
                        <Typography sx={{ fontSize: '11px', fontWeight: 800, color: 'var(--amber)' }}>{progress?.streak || 0} DAY STREAK</Typography>
                    </Box>
                </Box>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Typography className="fraunces" variant="h3" sx={{ fontWeight: 900, color: 'var(--black)', mb: 3, letterSpacing: '-1.5px', lineHeight: 1 }}>
                        Learn &<br /><em style={{ color: 'var(--green)' }}>Play.</em>
                    </Typography>
                    
                    <Box sx={{ bgcolor: 'var(--green-pale)', borderRadius: '24px', p: 3, border: '1px solid rgba(15, 110, 86, 0.1)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography sx={{ fontSize: '11px', color: 'var(--green)', opacity: 0.7, fontWeight: 800, mb: 0.5, letterSpacing: '1px' }}>TOTAL XP</Typography>
                                <Typography sx={{ fontSize: '28px', fontWeight: 900, color: 'var(--green)', lineHeight: 1 }}>{progress?.xp?.toLocaleString() || 0}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end', mb: 0.5 }}>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 900, color: 'var(--green)' }}>
                                        Global Rank: #{progress?.globalRank || '-'}
                                    </Typography>
                                </Box>
                                {progress?.cityRank && (
                                    <Typography sx={{ fontSize: '12px', color: 'var(--green)', opacity: 0.8, fontWeight: 700 }}>
                                        {progress.city} Rank: #{progress.cityRank}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Box>
                </motion.div>

                {/* Daily Challenge */}
                <Box sx={{ mt: 6 }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 900, letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase', mb: 2.5 }}>TODAY'S CHALLENGE</Typography>
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Box sx={{ bgcolor: 'var(--black)', borderRadius: '32px', p: 4, position: 'relative', overflow: 'hidden', color: '#fff' }}>
                            <Box sx={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, bgcolor: 'rgba(255,255,255,0.08)', px: 1.5, py: 0.6, borderRadius: '100px', mb: 2.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--amber)', animation: 'pulse 2s infinite' }} />
                                <Typography sx={{ fontSize: '10px', color: 'var(--amber)', fontWeight: 800 }}>
                                    {isCustomer ? 'DAILY · WELLNESS TRIVIA' : 'DAILY · DRUG KNOWLEDGE'}
                                </Typography>
                            </Box>
                            <Typography className="fraunces" variant="h5" sx={{ fontWeight: 900, mb: 1, lineHeight: 1.2 }}>
                                {isCustomer ? (
                                    <>Test your everyday<br /><em style={{ color: '#9FE1CB' }}>health and wellness</em> knowledge.</>
                                ) : (
                                    <>Test your clinical<br /><em style={{ color: '#9FE1CB' }}>pharmacology and interactions</em> knowledge.</>
                                )}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 3, fontWeight: 300, maxWidth: '80%' }}>
                                {isCustomer ? 'Randomized questions on healthy habits, nutrition, and everyday wellness.' : 'Randomized MCQs focusing on mechanisms, interactions, and specific counseling points.'}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 4 }}>
                                <Chip label="Up to +30 XP" size="small" sx={{ bgcolor: 'rgba(15, 110, 86, 0.4)', color: '#9FE1CB', fontWeight: 800, fontSize: '10px' }} />
                                <Chip label="3 questions" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '10px' }} />
                            </Box>
                            <Button 
                                fullWidth 
                                variant="contained" 
                                onClick={() => setQuizState({ open: true, type: isCustomer ? 'patient' : 'pharmacist' })}
                                sx={{ 
                                    bgcolor: 'var(--green)', 
                                    borderRadius: '16px', 
                                    py: 2, 
                                    textTransform: 'none', 
                                    fontWeight: 800,
                                    '&:hover': { bgcolor: '#0b5643' }
                                }}
                            >
                                Start challenge →
                            </Button>
                        </Box>
                    </motion.div>
                </Box>

                {/* General Health Grid (Patients & Everyone) */}
                <Box sx={{ mt: 6 }}>
                    <Typography sx={{ fontSize: '11px', fontWeight: 900, letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase', mb: 3 }}>HEALTH & LIFESTYLE</Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={6} sm={4}><ActivityCard onClick={() => setQuizState({ open: true, type: 'patient' })} title="Wellness Trivia" sub="Everyday health and lifestyle tips." xp="+10 XP per Q" color="blue" badge="New" delay={0} /></Grid>
                        <Grid item xs={6} sm={4}><ActivityCard title="Clinical Skills" sub="Test your diagnostic and clinical logic." xp="+50 XP per case" color="dark" badge="Coming Soon" delay={0.1} /></Grid>
                    </Grid>
                </Box>

                {/* Specialist Activities Grid */}
                {!isCustomer && (
                    <Box sx={{ mt: 6 }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 900, letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase', mb: 3 }}>CLINICAL SKILLS</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6} sm={4}><ActivityCard onClick={() => setQuizState({ open: true, type: 'pharmacist' })} title="Drug Knowledge" sub="MCQ on pharmacology and interactions." xp="+10 XP per Q" color="green" badge="Popular" delay={0} /></Grid>
                            <Grid item xs={6} sm={4}><ActivityCard title="Read a Prescription" sub="Interpret real digital scripts." xp="+25 XP per Round" color="pink" badge="Coming Soon" delay={1} /></Grid>
                            <Grid item xs={6} sm={4}><ActivityCard title="Identify This Drug" sub="Identify pills or packs from images." xp="+15 XP per Correct" color="amber" badge="Coming Soon" delay={2} /></Grid>
                        </Grid>
                    </Box>
                )}

                {/* Leaderboard */}
                <Box sx={{ mt: 8 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 900, letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                            {isCustomer ? 'TOP USERS' : 'TOP PHARMACISTS'}
                        </Typography>
                    </Box>
                    <Box sx={{ bgcolor: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
                        {leaderboard.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={20} /></Box>
                        ) : leaderboard.map((row, idx) => {
                            const isMe = user?.username === row.username;
                            const medalColor = idx === 0 ? '#BA7517' : idx === 1 ? '#888' : idx === 2 ? '#A0522D' : '#bbb';
                            
                            return (
                            <Box key={row._id} sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 2.5, 
                                p: 2.5, 
                                bgcolor: isMe ? 'rgba(15, 110, 86, 0.05)' : 'transparent',
                                borderBottom: idx === leaderboard.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.04)'
                            }}>
                                <Typography className="fraunces" sx={{ width: 25, textAlign: 'center', fontWeight: 950, fontSize: '18px', color: isMe ? 'var(--green)' : medalColor }}>{idx + 1}</Typography>
                                <Avatar sx={{ bgcolor: 'var(--green-pale)', color: 'var(--green)', fontWeight: 800, fontSize: '12px', width: 40, height: 40, border: isMe ? '2px solid var(--green)' : 'none' }}>
                                    {row.username.substring(0, 2).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: isMe ? 'var(--green)' : 'var(--black)' }}>
                                        {row.username} {isMe && <Box component="span" sx={{ fontSize: '11px', opacity: 0.6, ml: 1 }}>(you)</Box>}
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontWeight: 800, fontSize: '15px' }}>{row.xp?.toLocaleString() || 0} <Box component="span" sx={{ fontSize: '10px', color: 'var(--gray)', fontWeight: 400 }}>XP</Box></Typography>
                            </Box>
                        )})}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default LearningContent;
