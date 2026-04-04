"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, Paper, Switch, Button, Stack, CircularProgress } from "@mui/material";
import Navbar from "@/components/Navbar";
import { useSession } from "@/context/SessionProvider";

// Mock agent data
const mockAgents = [
  {
    id: "agent1",
    name: "Agent A",
    phone: "08090000001",
    status: true,
    email: "agent.a@email.com",
    joined: "2025-01-10",
  },
  {
    id: "agent2",
    name: "Agent B",
    phone: "08090000002",
    status: false,
    email: "agent.b@email.com",
    joined: "2025-02-15",
  },
  {
    id: "agent3",
    name: "Agent C",
    phone: "08090000003",
    status: true,
    email: "agent.c@email.com",
    joined: "2025-03-20",
  },
];


export default function DeliveryAgentsPage() {
  const [agents, setAgents] = useState(mockAgents);
  const router = useRouter();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth'); // Redirect to login if not authenticated
      } else if (user.role !== 'admin' && user.role !== 'agent') {
        router.push('/'); // Redirect to home if not authorized
      }
    }
  }, [user, isLoading, router]);

  const handleToggle = (id: string) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id ? { ...agent, status: !agent.status } : agent
      )
    );
  };

  const handleAgentClick = (id: string) => {
    router.push(`/admin/delivery-agents/${id}`);
  };

  // Render a loading state while checking for authentication and authorization
  if (isLoading || !user || (user.role !== 'admin' && user.role !== 'agent')) {
    return (
      <>
        <Navbar />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#1B5E20", mb: 3 }}>
          Delivery Agent Management
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {agents.map((agent) => (
            <Box key={agent.id} sx={{ width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 16px)'}, minWidth: 280, flexGrow: 1 }}>
              <Paper
                sx={{ p: 2, borderLeft: 4, borderColor: agent.status ? "#1B5E20" : "#E91E63", cursor: "pointer", transition: "box-shadow 0.2s", '&:hover': { boxShadow: 6 } }}
                onClick={() => handleAgentClick(agent.id)}
                elevation={3}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" fontWeight={600}>{agent.name}</Typography>
                  <Switch
                    checked={agent.status}
                    onClick={e => e.stopPropagation()}
                    onChange={() => handleToggle(agent.id)}
                    color="success"
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">Phone: {agent.phone}</Typography>
                <Typography variant="body2" color="text.secondary">Email: {agent.email}</Typography>
                <Typography variant="body2" color="text.secondary">Joined: {agent.joined}</Typography>
                <Typography variant="body2" color={agent.status ? "success.main" : "error.main"} fontWeight={500}>
                  {agent.status ? "Active" : "Inactive"}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={e => { e.stopPropagation(); handleToggle(agent.id); }}
                  color={agent.status ? "error" : "success"}
                  fullWidth
                >
                  {agent.status ? "Deactivate" : "Activate"}
                </Button>
              </Paper>
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
}
