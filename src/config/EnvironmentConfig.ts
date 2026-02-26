export const EnvironmentConfig = {
    // Defines when specific night-time only features turn on/off
    NIGHT_START_HOUR: 18, // 6:00 PM
    NIGHT_END_HOUR: 6,    // 6:00 AM

    // Detailed lighting palette over the 24 hour cycle
    // Interpolation will happen automatically between these keyframes
    timePalette: [
        { name: "Deep Night", t: 0, sky: '#0a120a', fog: '#0e1a0e', amb: '#6677aa', sun: '#99aacc', int: 2.0, fill: '#556688', hemi: '#4466aa' },
        { name: "Pre-Dawn", t: 5, sky: '#0a120a', fog: '#0e1a0e', amb: '#6677aa', sun: '#99aacc', int: 2.0, fill: '#556688', hemi: '#4466aa' },
        { name: "Sunrise", t: 7, sky: '#ff9955', fog: '#cc7744', amb: '#886655', sun: '#ffaa66', int: 2.5, fill: '#554433', hemi: '#ffaa88' },
        { name: "Morning", t: 9, sky: '#87CEEB', fog: '#aaeeff', amb: '#aaddff', sun: '#ffffdd', int: 3.0, fill: '#7799aa', hemi: '#88ccff' },
        { name: "Noon", t: 12, sky: '#66bbee', fog: '#99ddff', amb: '#bbddee', sun: '#ffffff', int: 3.5, fill: '#99bbcc', hemi: '#99ddff' },
        { name: "Afternoon", t: 15, sky: '#87CEEB', fog: '#aaeeff', amb: '#aaddff', sun: '#ffffdd', int: 3.0, fill: '#7799aa', hemi: '#88ccff' },
        { name: "Sunset", t: 17, sky: '#ff9955', fog: '#cc7744', amb: '#886655', sun: '#ffaa66', int: 2.5, fill: '#554433', hemi: '#ffaa88' },
        { name: "Nightfall", t: 19, sky: '#0a120a', fog: '#0e1a0e', amb: '#6677aa', sun: '#99aacc', int: 2.0, fill: '#556688', hemi: '#4466aa' },
        { name: "Midnight", t: 24, sky: '#0a120a', fog: '#0e1a0e', amb: '#6677aa', sun: '#99aacc', int: 2.0, fill: '#556688', hemi: '#4466aa' },
    ]
};
