import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getVolumeChart } from '../../api/history';
import { getPlans } from '../../api/plans';
import { BarChart } from 'react-native-gifted-charts';
import { getSmartChartLayout, Period } from '../../utils/chartLayout'; 
import { Ionicons } from '@expo/vector-icons';

const PERIODS: Period[] = ['1M', '3M', '6M', '1Y', 'ALL'];

export default function AnalyticsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();

    // FILTERS
    const [period, setPeriod] = useState<Period>('1M');
    const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);

    // DATA
    const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
    const { data: chartData, isLoading } = useQuery({
        queryKey: ['volumeChart', period, selectedPlanId],
        queryFn: () => getVolumeChart(period, selectedPlanId)
    });

    const renderChart = () => {
        if (isLoading) return <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />;
        
        if (!chartData || chartData.length === 0) {
            return (
                <View style={styles.emptyBox}>
                    <Text style={{ color: theme.colors.textSecondary }}>No data for this period.</Text>
                </View>
            );
        }

        // --- 1. CALL LAYOUT ENGINE ---
        const { 
            barWidth, 
            spacing, 
            chartWidth, 
            initialSpacing, 
            showLabels,
            isScrollable 
        } = getSmartChartLayout({
            dataCount: chartData.length,
            period: period,
            screenPadding: 48 // Matches card padding
        });

        // --- 2. VERTICAL SCALING ---
        const maxDataValue = Math.max(...chartData.map(d => d.value));
        const yAxisMaxValue = maxDataValue > 0 ? Math.ceil(maxDataValue * 1.35) : 100;

        const formattedData = chartData.map(item => ({
            value: item.value,
            label: item.label,
            frontColor: theme.colors.primary,
            topLabelComponent: (showLabels && item.value > 0) ? () => (
                <Text style={{ 
                    color: theme.colors.primary, 
                    fontSize: 10, 
                    marginBottom: 4, 
                    fontWeight: 'bold',
                    width: barWidth + 30, // Wider container to prevent wrapping
                    textAlign: 'center',
                    marginLeft: -15 // Center the wider text container over the bar
                }}>
                    {(item.value / 1000).toFixed(1)}k
                </Text>
            ) : undefined,
        }));

        return (
            <View style={{ marginLeft: -10 }}>
                <BarChart
                    data={formattedData}
                    // Layout
                    width={chartWidth}
                    barWidth={barWidth}
                    spacing={spacing}
                    initialSpacing={initialSpacing}
                    
                    // Scrolling Logic
                    scrollToEnd={isScrollable} 
                    
                    // Vertical
                    maxValue={yAxisMaxValue} 
                    noOfSections={4}
                    
                    // Style
                    roundedTop
                    roundedBottom
                    hideRules
                    xAxisThickness={0}
                    yAxisThickness={0}
                    
                    // Axis Text
                    yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
                    // Clean up X-Axis for dense charts
                    xAxisLabelTextStyle={{ 
                        color: theme.colors.textSecondary, 
                        fontSize: 9,
                        width: 40, // Prevent overlapping
                        textAlign: 'center'
                    }}
                    
                    isAnimated
                    animationDuration={400}
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.colors.text }]}>Analytics</Text>
                <View style={{ width: 40 }} /> 
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* 1. PLAN SELECTOR */}
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Filter by Plan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <TouchableOpacity
                        style={[
                            styles.chip,
                            !selectedPlanId ? { backgroundColor: theme.colors.primary } : { borderColor: theme.colors.border, borderWidth: 1 }
                        ]}
                        onPress={() => setSelectedPlanId(undefined)}
                    >
                        <Text style={{ color: !selectedPlanId ? 'white' : theme.colors.text }}>All Plans</Text>
                    </TouchableOpacity>
                    {plans?.map(plan => (
                        <TouchableOpacity
                            key={plan.id}
                            style={[
                                styles.chip,
                                selectedPlanId === plan.id 
                                    ? { backgroundColor: theme.colors.primary } 
                                    : { borderColor: theme.colors.border, borderWidth: 1 }
                            ]}
                            onPress={() => setSelectedPlanId(plan.id)}
                        >
                            <Text style={{ color: selectedPlanId === plan.id ? 'white' : theme.colors.text }}>{plan.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* 2. SEGMENT CONTROL */}
                <View style={[styles.segmentContainer, { backgroundColor: theme.colors.inputBackground }]}>
                    {PERIODS.map(p => (
                        <TouchableOpacity 
                            key={p} 
                            style={[
                                styles.segmentButton, 
                                period === p && { backgroundColor: theme.colors.card, shadowOpacity: 0.1 }
                            ]}
                            onPress={() => setPeriod(p)}
                        >
                            <Text style={{ fontWeight: '600', color: period === p ? theme.colors.primary : theme.colors.textSecondary }}>{p}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* 3. CHART CARD */}
                <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Volume Load</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                        Total weight moved (kg)
                    </Text>
                    {renderChart()}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8 },
    title: { fontSize: 20, fontWeight: 'bold' },
    sectionLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    segmentContainer: { flexDirection: 'row', padding: 4, borderRadius: 12, marginBottom: 16 },
    segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
    card: { padding: 16, borderRadius: 16, minHeight: 250, justifyContent: 'center' },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    emptyBox: { height: 200, justifyContent: 'center', alignItems: 'center' },
});