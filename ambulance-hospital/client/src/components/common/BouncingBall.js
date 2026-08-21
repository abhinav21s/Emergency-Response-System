import React, { useEffect, useRef } from 'react';

const BouncingBall = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to match parent container
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    };
    
    // Initial resize
    resizeCanvas();
    
    // Resize on window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Ball properties
    const balls = [
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 15,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
        color: 'rgba(99, 102, 241, 0.4)'
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 20,
        dx: (Math.random() - 0.5) * 1.5,
        dy: (Math.random() - 0.5) * 1.5,
        color: 'rgba(16, 185, 129, 0.3)'
      },
      {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 25,
        dx: (Math.random() - 0.5) * 1,
        dy: (Math.random() - 0.5) * 1,
        color: 'rgba(239, 68, 68, 0.2)'
      }
    ];
    
    // Animation function
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw and update each ball
      balls.forEach(ball => {
        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        
        // Add blur effect
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Update position
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // Bounce off walls
        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
          ball.dx = -ball.dx;
        }
        
        if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
          ball.dy = -ball.dy;
        }
      });
      
      // Request next frame
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
};

export default BouncingBall;
