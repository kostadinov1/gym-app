import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getStats, getVolumeChart } from '../../api/history';
import { getPlans } from '../../api/plans';
import { BarChart } from 'react-native-gifted-charts';
import { getSmartChartLayout, Period } from '../../utils/chartLayout';

const PERIODS: Period[] = ['1M', '3M', '6M', '1Y', 'ALL'];
const DATE_FMT: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
const WINDOW_FMT: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' };
const WINDOW_WITH_YEAR_FMT: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

export default function AnalyticsScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();

    const [period, setPeriod] = useState<Period>('1M');
    const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
    const [anchorDate, setAnchorDate] = useState<Date>(new Date());
    const [selectedPoint, setSelectedPoint] = useState<{ date: string; value: number } | null>(null);
    const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

    const normalizeAnchorForPeriod = (input: Date, p: Period) => {
        const normalized = new Date(input);
        normalized.setUTCHours(0, 0, 0, 0);

        if (p === '1M' || p === '1Y' || p === 'ALL') {
            return new Date(Date.UTC(normalized.getUTCFullYear(), normalized.getUTCMonth(), 1));
        }

        // Weekly windows: anchor to ISO week start (Monday)
        const weekday = normalized.getUTCDay(); // Sun=0..Sat=6
        const daysFromMonday = (weekday + 6) % 7;
        normalized.setUTCDate(normalized.getUTCDate() - daysFromMonday);
        return normalized;
    };

    const toApiDate = (date: Date) => {
        const year = date.getUTCFullYear();
        const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
        const day = `${date.getUTCDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
    const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });
    const { data: chartData, isLoading } = useQuery({
        queryKey: ['volumeChart', period, selectedPlanId, toApiDate(anchorDate)],
        queryFn: () => getVolumeChart(period, selectedPlanId, toApiDate(anchorDate))
    });

    const latestDataDate = stats?.last_workout_date ? new Date(stats.last_workout_date) : null;
    const latestReferenceDate = latestDataDate && latestDataDate > new Date() ? latestDataDate : new Date();

    useEffect(() => {
        if (!latestDataDate) return;
        const maxAnchor = normalizeAnchorForPeriod(latestReferenceDate, period);
        const currentAnchor = normalizeAnchorForPeriod(anchorDate, period);
        if (currentAnchor < maxAnchor) {
            setAnchorDate(maxAnchor);
        }
    }, [stats?.last_workout_date, period]);

    const formatCompactNumber = (value: number) => {
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
        return `${Math.round(value)}`;
    };

    const formatYAxisLabel = (label: string) => {
        const numericValue = Number(label);
        if (!Number.isFinite(numericValue)) return label;
        return formatCompactNumber(numericValue);
    };

    const formatPointDate = (isoDate: string) => {
        const parsed = new Date(isoDate);
        if (Number.isNaN(parsed.getTime())) return isoDate;
        return parsed.toLocaleDateString(undefined, DATE_FMT);
    };

    const xAxisLabelStep = (currentPeriod: Period, count: number) => {
        if (currentPeriod === '1M') return 5;
        if (currentPeriod === '3M') return 2;
        if (currentPeriod === '6M') return 3;
        if (currentPeriod === 'ALL') return count > 24 ? 2 : 1;
        return 1;
    };

    const shiftAnchorDate = (direction: 'prev' | 'next') => {
        const factor = direction === 'prev' ? -1 : 1;
        const base = normalizeAnchorForPeriod(anchorDate, period);
        const next = new Date(base);

        if (period === '1M') next.setUTCMonth(next.getUTCMonth() + factor, 1);
        else if (period === '3M') next.setUTCDate(next.getUTCDate() + (13 * 7 * factor));
        else if (period === '6M') next.setUTCDate(next.getUTCDate() + (26 * 7 * factor));
        else next.setUTCMonth(next.getUTCMonth() + (12 * factor), 1);

        const maxAnchor = normalizeAnchorForPeriod(latestReferenceDate, period);
        if (next > maxAnchor) return;

        setAnchorDate(next);
        setSelectedPoint(null);
        setSelectedBarIndex(null);
    };

    const getWindowLabel = () => {
        if (period === '1M') {
            return anchorDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        }
        if (period === '3M') return `13 weeks ending ${anchorDate.toLocaleDateString(undefined, WINDOW_WITH_YEAR_FMT)}`;
        if (period === '6M') return `26 weeks ending ${anchorDate.toLocaleDateString(undefined, WINDOW_WITH_YEAR_FMT)}`;
        if (period === '1Y') return `12 months ending ${anchorDate.toLocaleDateString(undefined, WINDOW_FMT)}`;
        return `All time to ${anchorDate.toLocaleDateString(undefined, WINDOW_FMT)}`;
    };

    const maxAnchorForPeriod = normalizeAnchorForPeriod(latestReferenceDate, period);
    const isAtLatestWindow = normalizeAnchorForPeriod(anchorDate, period).getTime() >= maxAnchorForPeriod.getTime();
    const hasAnyDataInCurrentWindow = !!chartData && chartData.some(item => item.value > 0);
    const disablePrevArrow = isLoading || (chartData ? !hasAnyDataInCurrentWindow : false);

    const renderChart = () => {
        if (isLoading) return <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />;

        if (!chartData || chartData.length === 0) {
            return (
                <View style={styles.emptyBox}>
                    <Text style={{ color: theme.colors.textSecondary }}>No data for this period.</Text>
                </View>
            );
        }

        const {
            barWidth,
            spacing,
            chartWidth,
            initialSpacing,
            endSpacing,
            xAxisLabelWidth,
            isScrollable
        } = getSmartChartLayout({
            dataCount: chartData.length,
            period,
            screenPadding: 48
        });

        const maxDataValue = Math.max(...chartData.map(d => d.value));
        const yAxisMaxValue = maxDataValue > 0 ? Math.ceil(maxDataValue * 1.35) : 100;
        const step = xAxisLabelStep(period, chartData.length);
        const hasAnyVolume = hasAnyDataInCurrentWindow;
        const visualInitialSpacing = Math.max(initialSpacing, 14);
        const visualEndSpacing = Math.max(endSpacing, 20);
        const totalContentWidth = chartData.length * (barWidth + spacing) + visualInitialSpacing + visualEndSpacing;
        const fixedWidth = !isScrollable && chartWidth ? Math.max(chartWidth - 16, 0) : undefined;
        const shouldForceScroll = fixedWidth !== undefined && totalContentWidth > (fixedWidth - 2);
        const useScroll = isScrollable || shouldForceScroll;

        const formattedData = chartData.map((item, index) => ({
            value: item.value,
            label: (index % step === 0 || index === chartData.length - 1) ? item.label : '',
            frontColor: theme.colors.primary,
            onPress: () => {
                setSelectedPoint({ date: item.date, value: item.value });
                setSelectedBarIndex(index);
            },
            topLabelComponent: selectedBarIndex === index ? () => (
                <View style={[styles.tooltip, { borderColor: theme.colors.primary, backgroundColor: theme.colors.card }]}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 10 }}>
                        {formatPointDate(item.date)}
                    </Text>
                    <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '700' }}>
                        {formatCompactNumber(item.value)} kg
                    </Text>
                </View>
            ) : undefined,
            topLabelContainerStyle: selectedBarIndex === index
                ? { width: 120, marginLeft: -52, alignItems: 'center' as const }
                : undefined,
            topLabelComponentHeight: selectedBarIndex === index ? 44 : 0,
        }));

        return (
            <View>
                {!hasAnyVolume && (
                    <View style={styles.emptyHint}>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>No workouts in this time window.</Text>
                    </View>
                )}
                <BarChart
                    key={`${period}-${selectedPlanId ?? 'all'}-${toApiDate(anchorDate)}`}
                    data={formattedData}
                    width={useScroll ? undefined : fixedWidth}
                    height={190}
                    barWidth={barWidth}
                    spacing={spacing}
                    initialSpacing={visualInitialSpacing}
                    endSpacing={visualEndSpacing}
                    disableScroll={!useScroll}
                    showScrollIndicator={false}
                    scrollToEnd={useScroll}
                    maxValue={yAxisMaxValue}
                    overflowTop={64}
                    noOfSections={4}
                    formatYLabel={formatYAxisLabel}
                    roundedTop
                    roundedBottom
                    rulesColor={theme.colors.border}
                    rulesType="dashed"
                    dashWidth={3}
                    dashGap={4}
                    xAxisThickness={0}
                    yAxisThickness={0}
                    yAxisLabelWidth={44}
                    yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
                    xAxisLabelTextStyle={{
                        color: theme.colors.textSecondary,
                        fontSize: 9,
                        width: xAxisLabelWidth,
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
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Filter by Plan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <TouchableOpacity
                        style={[
                            styles.chip,
                            !selectedPlanId ? { backgroundColor: theme.colors.primary } : { borderColor: theme.colors.border, borderWidth: 1 }
                        ]}
                        onPress={() => {
                            setSelectedPlanId(undefined);
                            setSelectedPoint(null);
                            setSelectedBarIndex(null);
                        }}
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
                            onPress={() => {
                                setSelectedPlanId(plan.id);
                                setSelectedPoint(null);
                                setSelectedBarIndex(null);
                            }}
                        >
                            <Text style={{ color: selectedPlanId === plan.id ? 'white' : theme.colors.text }}>{plan.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={[styles.segmentContainer, { backgroundColor: theme.colors.inputBackground }]}>
                    {PERIODS.map(p => (
                        <TouchableOpacity
                            key={p}
                            style={[
                                styles.segmentButton,
                                period === p && { backgroundColor: theme.colors.card, shadowOpacity: 0.1 }
                            ]}
                            onPress={() => {
                                setPeriod(p);
                                setAnchorDate((current) => normalizeAnchorForPeriod(current, p));
                                setSelectedPoint(null);
                                setSelectedBarIndex(null);
                            }}
                        >
                            <Text style={{ fontWeight: '600', color: period === p ? theme.colors.primary : theme.colors.textSecondary }}>{p}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={[styles.card, { backgroundColor: theme.colors.card }]}> 
                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Volume Load</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
                        Total weight moved (kg)
                    </Text>

                    <View style={[styles.windowRow, { borderColor: theme.colors.border }]}> 
                        <TouchableOpacity
                            onPress={() => shiftAnchorDate('prev')}
                            style={styles.windowButton}
                            disabled={disablePrevArrow}
                        >
                            <Text style={{ color: disablePrevArrow ? theme.colors.textSecondary : theme.colors.primary, fontWeight: '700' }}>{'<'}</Text>
                        </TouchableOpacity>
                        <Text style={[styles.windowLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {getWindowLabel()}
                        </Text>
                        <TouchableOpacity
                            onPress={() => shiftAnchorDate('next')}
                            style={styles.windowButton}
                            disabled={isLoading || isAtLatestWindow}
                        >
                            <Text style={{ color: (isLoading || isAtLatestWindow) ? theme.colors.textSecondary : theme.colors.primary, fontWeight: '700' }}>{'>'}</Text>
                        </TouchableOpacity>
                    </View>
                    {!isAtLatestWindow && (
                        <TouchableOpacity onPress={() => setAnchorDate(maxAnchorForPeriod)} style={{ marginBottom: 8 }}>
                            <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}>Back to latest</Text>
                        </TouchableOpacity>
                    )}

                    {!!selectedPoint && (
                        <Text style={{ color: theme.colors.primary, fontSize: 12, marginBottom: 8, fontWeight: '600' }}>
                            {formatPointDate(selectedPoint.date)} • {formatCompactNumber(selectedPoint.value)} kg
                        </Text>
                    )}

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
    card: { padding: 16, borderRadius: 16, minHeight: 250, justifyContent: 'center', overflow: 'hidden' },
    windowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, marginBottom: 12 },
    windowButton: { paddingHorizontal: 12, paddingVertical: 8 },
    windowLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    emptyBox: { height: 200, justifyContent: 'center', alignItems: 'center' },
    emptyHint: { alignItems: 'center', marginBottom: 8 },
    tooltip: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 86,
        minHeight: 28,
        alignItems: 'center',
        marginBottom: 6,
    },
});
