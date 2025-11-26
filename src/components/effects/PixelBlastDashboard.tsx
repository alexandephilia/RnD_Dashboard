"use client";

import React from 'react';
import PixelBlast from './PixelBlast';

const PixelBlastDashboard: React.FC = () => {
    return (
        <PixelBlast
            variant="circle"
            pixelSize={4}
            color="#FACC15"
            patternScale={2.5}
            patternDensity={1.1}
            pixelSizeJitter={0.3}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid
            liquidStrength={0.15}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            wave
            waveStrength={25}
            waveFrequency={0.03}
            speed={0.6}
            edgeFade={0.25}
            transparent
            respectLayout={true}
            targetSelector="[data-pixelblast-dashboard='true']"
            className="pointer-events-none"
        />
    );
};

export default PixelBlastDashboard;
