export const EnvironmentConfig = {
    // Detailed lighting palette. 
    // `duration`: How many seconds this exact color palette holds perfectly still.
    // `transition`: How many seconds it takes to smoothly blend into the next phase.
    timePalette: [
        // Exact original Night mode colors from 'new' branch
        { name: "Night", duration: 30, transition: 8, sky: '#0a120a', fog: '#0e1a0e', amb: '#6677aa', sun: '#99aacc', int: 2.0, fill: '#556688', hemi: '#4466aa' },
        { name: "Morning", duration: 5, transition: 6, sky: '#ff6633', fog: '#dd4411', amb: '#994422', sun: '#ff8844', int: 3.0, fill: '#663322', hemi: '#ffaa66' },
        { name: "Afternoon", duration: 30, transition: 8, sky: '#66bbee', fog: '#99ddff', amb: '#bbddee', sun: '#ffffff', int: 3.5, fill: '#99bbcc', hemi: '#99ddff' },
        { name: "Evening", duration: 5, transition: 8, sky: '#7722cc', fog: '#5511aa', amb: '#552288', sun: '#ff66bb', int: 2.5, fill: '#331166', hemi: '#aa55ee' },
    ]
};
