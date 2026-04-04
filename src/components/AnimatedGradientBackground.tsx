
import { Box } from '@mui/material';

const AnimatedGradientBackground = () => {
  return (
    <>
      <style>
        {`
          @keyframes wavyGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          background: 'linear-gradient(120deg, #e43a5a,rgb(134, 3, 112),rgb(16, 172, 157), rgb(61, 149, 249),rgb(170, 73, 244))',
          backgroundSize: '300% 300%',
          animation: 'wavyGradient 8s ease infinite',
        }}
      />
    </>
  );
};

export default AnimatedGradientBackground;
