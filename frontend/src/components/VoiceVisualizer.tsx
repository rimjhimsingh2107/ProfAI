import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const VoiceVisualizer: React.FC = () => {
  const [bars, setBars] = useState<number[]>(Array(20).fill(0));

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 100));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center mb-4">
      <div className="glassmorphism rounded-full px-6 py-4">
        <div className="flex items-center space-x-1">
          {bars.map((height, index) => (
            <motion.div
              key={index}
              className="w-1 bg-gradient-to-t from-pink-400 to-purple-400 rounded-full"
              animate={{
                height: `${10 + height * 0.4}px`,
              }}
              transition={{
                duration: 0.1,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        <p className="text-white/80 text-sm text-center mt-2">Listening...</p>
      </div>
    </div>
  );
};

export default VoiceVisualizer;
