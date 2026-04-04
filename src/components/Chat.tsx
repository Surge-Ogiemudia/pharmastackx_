
"use client";
import { useState, useEffect, useRef } from 'react';
import { useSession } from "@/context/SessionProvider";
import { Box, TextField, Button, Typography, CircularProgress, Paper, Avatar, IconButton } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { io, Socket } from "socket.io-client";

interface ChatProps {
    user: {
        _id: string;
        username: string;
        role: string;
        profilePicture?: string;
    };
    onBack: () => void;
}

interface Message {
    _id: string;
    sender: string;
    receiver: string;
    content: string;
    createdAt: string;
}

let socket: Socket;

const Chat = ({ user, onBack }: ChatProps) => {
    const { user: currentUser } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        const fetchMessages = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/messages/${user._id}`);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setMessages(data);
                    } else {
                        console.error("Failed to fetch messages: Data is not an array", data);
                        setMessages([]); // Set to empty array on unexpected data format
                    }
                } else {
                    console.error("Failed to fetch messages with status:", response.status);
                    setMessages([]); // Set to empty array on error
                }
            } catch (error) {
                console.error("Failed to fetch messages", error);
                setMessages([]); // Also set to empty array on network errors
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser?._id) {
            fetchMessages();
        } else {
            setIsLoading(false);
            setMessages([]);
        }

        // Initialize Socket.IO connection
        socket = io({ path: '/api/socket' });

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            if (currentUser) {
                socket.emit('register', currentUser._id);
            }
        });

        socket.on('receiveMessage', (message: Message) => {
            if (message.sender === user._id || message.sender === currentUser?._id) {
                setMessages(prevMessages => [...prevMessages, message]);
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        return () => {
            console.log('Disconnecting socket');
            socket.disconnect();
        };
    }, [user._id, currentUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser || !currentUser._id) return;

        const messageData = {
            content: newMessage,
            receiverId: user._id,
        };

        // Optimistic UI update
        const optimisticMessage: Message = {
            _id: new Date().toISOString(), // Temporary ID
            sender: currentUser._id,
            receiver: user._id,
            content: newMessage,
            createdAt: new Date().toISOString(),
        };
        setMessages(prevMessages => [...prevMessages, optimisticMessage]);
        setNewMessage('');

        socket.emit('sendMessage', messageData);
    };

    return (
        <Paper elevation={3} sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', bgcolor: 'white', borderRadius: '16px', overflow: 'hidden' }}>
            <Paper elevation={1} sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: '#f5f5f5', borderBottom: '1px solid rgba(0,0,0,0.12)' }}>
                <IconButton onClick={onBack}>
                    <ArrowBack />
                </IconButton>
                <Avatar src={user.profilePicture} alt={user.username} sx={{ ml: 1, mr: 2 }} />
                <Typography variant="h6" sx={{ color: 'black' }}>{user.username}</Typography>
            </Paper>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, bgcolor: '#ffffff' }}>
                {isLoading ? (
                    <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />
                ) : (
                    messages.map((msg) => (
                        <Box
                            key={msg._id}
                            sx={{
                                display: 'flex',
                                justifyContent: msg.sender === currentUser?._id ? 'flex-end' : 'flex-start',
                                mb: 1,
                            }}
                        >
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 1.5,
                                    borderRadius: '12px',
                                    bgcolor: msg.sender === currentUser?._id ? 'primary.main' : '#e0e0e0',
                                    color: msg.sender === currentUser?._id ? 'white' : 'black',
                                    maxWidth: '70%',
                                }}
                            >
                                <Typography variant="body1">{msg.content}</Typography>
                            </Paper>
                        </Box>
                    ))
                )}
                <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        sx={{ input: { color: 'black' }, bgcolor: 'white' }}
                    />
                    <Button type="submit" variant="contained" disabled={!newMessage.trim()}>Send</Button>
                </form>
            </Box>
        </Paper>
    );
};

export default Chat;
