import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LBS_PER_KG = 2.20462;
const KG_PER_LBS = 1 / LBS_PER_KG;

const STORAGE_KEY = 'unit_preference';

interface UnitsContextValue {
    isMetric: boolean;
    toggleUnit: () => void;
    unitLabel: 'kg' | 'lbs';
    /** Convert a kg value (from DB) to the display unit, rounded to 1 decimal */
    kgToDisplay: (kg: number) => number;
    /** Convert a user-entered value (in display units) back to kg for storage */
    displayToKg: (val: number) => number;
    /** Weight step for Stepper: 2.5 kg or 5 lbs */
    weightStep: number;
}

const UnitsContext = createContext<UnitsContextValue>({
    isMetric: true,
    toggleUnit: () => {},
    unitLabel: 'kg',
    kgToDisplay: (kg) => kg,
    displayToKg: (val) => val,
    weightStep: 2.5,
});

export const UnitsProvider = ({ children }: { children: React.ReactNode }) => {
    const [isMetric, setIsMetric] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then((value) => {
            if (value !== null) setIsMetric(value === 'true');
        });
    }, []);

    const toggleUnit = () => {
        const next = !isMetric;
        setIsMetric(next);
        AsyncStorage.setItem(STORAGE_KEY, String(next));
    };

    const kgToDisplay = (kg: number): number => {
        if (isMetric) return Math.round(kg * 10) / 10;
        return Math.round(kg * LBS_PER_KG * 10) / 10;
    };

    const displayToKg = (val: number): number => {
        if (isMetric) return val;
        return val * KG_PER_LBS;
    };

    return (
        <UnitsContext.Provider
            value={{
                isMetric,
                toggleUnit,
                unitLabel: isMetric ? 'kg' : 'lbs',
                kgToDisplay,
                displayToKg,
                weightStep: isMetric ? 2.5 : 5,
            }}
        >
            {children}
        </UnitsContext.Provider>
    );
};

export const useUnits = () => useContext(UnitsContext);
