"use client";
import React from "react";
import { useParams } from "next/navigation";
import { Box, Typography, Paper, Stack, Button, Divider } from "@mui/material";
import Navbar from "@/components/Navbar";

// Mock agent and order log data
const mockAgent = {
  id: "agent1",
  name: "Agent A",
  phone: "08090000001",
  email: "agent.a@email.com",
  joined: "2025-01-10",
  status: true,
};

const mockLog = [
  { time: "10:01, 2025-11-04", action: "Order #123 accepted" },
  { time: "10:05, 2025-11-04", action: "Order #123 picked up" },
  { time: "10:20, 2025-11-04", action: "Order #123 completed" },
  { time: "11:00, 2025-11-04", action: "Order #124 accepted" },
  { time: "11:10, 2025-11-04", action: "Order #124 cancelled" },
];

const mockAnalytics = {
  totalOrders: 12,
  accepted: 10,
  completed: 8,
  cancelled: 2,
  pending: 2,
};

export default function AgentDetailPage() {
  const params = useParams();
  // In real app, fetch agent and log data by params.id
  const agent = mockAgent;
  const log = mockLog;
  const analytics = mockAnalytics;

  return (
    <>
      <Navbar />
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#1B5E20", mb: 2 }}>
          Agent: {agent.name}
        </Typography>
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600}>Contact: {agent.phone} | {agent.email}</Typography>
          <Typography variant="body2" color="text.secondary">Joined: {agent.joined}</Typography>
          <Typography variant="body2" color={agent.status ? "success.main" : "error.main"} fontWeight={500}>
            {agent.status ? "Active" : "Inactive"}
          </Typography>
        </Paper>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          <Box sx={{ flexGrow: 1, minWidth: { xs: 'calc(50% - 8px)', sm: 150 } }}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">{analytics.totalOrders}</Typography><Typography variant="caption">Total Orders</Typography></Paper></Box>
          <Box sx={{ flexGrow: 1, minWidth: { xs: 'calc(50% - 8px)', sm: 150 } }}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">{analytics.accepted}</Typography><Typography variant="caption">Accepted</Typography></Paper></Box>
          <Box sx={{ flexGrow: 1, minWidth: { xs: 'calc(50% - 8px)', sm: 150 } }}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">{analytics.completed}</Typography><Typography variant="caption">Completed</Typography></Paper></Box>
          <Box sx={{ flexGrow: 1, minWidth: { xs: 'calc(50% - 8px)', sm: 150 } }}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="h6">{analytics.cancelled}</Typography><Typography variant="caption">Cancelled</Typography></Paper></Box>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Button variant="contained" color="primary" sx={{ mr: 2 }}>Download CSV</Button>
          <Button variant="outlined" color="secondary">Download PDF</Button>
        </Box>
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" sx={{ mb: 2 }}>Action Log</Typography>
        <Stack spacing={1}>
          {log.map((entry, idx) => (
            <Paper key={idx} sx={{ p: 1.5, bgcolor: '#f9fbe7' }}>
              <Typography variant="body2" fontWeight={600}>{entry.time}</Typography>
              <Typography variant="body2">{entry.action}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
    </>
  );
}
