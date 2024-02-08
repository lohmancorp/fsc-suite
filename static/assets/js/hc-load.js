function calculateEngineersRequired(Nh, U1, U2, U3, S, V, WHPAM) {
    // Calculate total hours needed
    const Htotal = (Nh / (U1 * U2 * U3)) * V * S;

    // Calculate total engineers required, assuming 168 working hours per month per engineer
    const Etotal = Htotal / WHPAM;
    
    // Round up to the nearest whole number since we can't have a fraction of an engineer
    return Math.ceil(Etotal);
}

// Example usage:
// These values should come from your application's input or data source
const AHT = 2.50; // Average handle time in hours  (SHOULD BE INPUT VALUE)
const N = 500; // Average tickets number per month (SHOULD BE INPUT VALUE)
const Nh = AHT * N; // Active hours per month 
const U1 = 1.0; // Meal and rest periods
const U2 = 0.8; // Ticket processing utilization
const U3 = 0.99; // Education and RnD coefficient
const S = 1.03; // Sickness coefficient
const V = 1.08; // Vacation coefficient
const WHPAM = 168; // Working hours per agent month

// Now we call the function with the example values
const totalEngineers = calculateEngineersRequired(Nh, U1, U2, U3, S, V);

return totalEngineers;



