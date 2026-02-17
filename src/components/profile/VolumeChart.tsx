import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getVolumeChart } from '../../api/history';
import { getSmartChartLayout } from '../../utils/chartLayout';

export const VolumeChart = () => {
    const theme = useTheme();
    const [selectedPoint, setSelectedPoint] = useState<{ date: string; value: number } | null>(null);
    const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['volumeChart', 'preview'],
        queryFn: () => getVolumeChart('3M') 
    });

    if (isLoading) return <ActivityIndicator color={theme.colors.primary} />;

    if (error || !data || data.length === 0) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.card }, styles.emptyContainer]}>
                <Text style={{ color: theme.colors.textSecondary }}>No data available for charts.</Text>
            </View>
        );
    }

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
        return parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    };

    const {
        barWidth,
        spacing,
        chartWidth,
        initialSpacing,
        endSpacing,
        xAxisLabelWidth,
        isScrollable
    } = getSmartChartLayout({
        dataCount: data.length,
        period: '3M',
        screenPadding: 48
    });

    const maxDataValue = Math.max(...data.map(d => d.value));
    const yAxisMaxValue = maxDataValue > 0 ? Math.ceil(maxDataValue * 1.35) : 100;
    const step = data.length > 12 ? 2 : 1;
    const visualInitialSpacing = Math.max(initialSpacing, 14);
    const visualEndSpacing = Math.max(endSpacing, 20);
    const totalContentWidth = data.length * (barWidth + spacing) + visualInitialSpacing + visualEndSpacing;
    const fixedWidth = !isScrollable && chartWidth ? Math.max(chartWidth - 16, 0) : undefined;
    const shouldForceScroll = fixedWidth !== undefined && totalContentWidth > (fixedWidth - 2);
    const useScroll = isScrollable || shouldForceScroll;

    const chartData = data.map((item, index) => ({
        value: item.value,
        label: (index % step === 0 || index === data.length - 1) ? item.label : '',
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
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Volume Load (Last 3 Months)</Text>
            {!!selectedPoint && (
                <Text style={{ color: theme.colors.primary, fontSize: 12, marginBottom: 6, fontWeight: '600' }}>
                    {formatPointDate(selectedPoint.date)} • {formatCompactNumber(selectedPoint.value)} kg
                </Text>
            )}
            
            <View style={{ paddingVertical: 10 }}> 
                <BarChart
                    data={chartData}
                    width={useScroll ? undefined : fixedWidth}
                    height={170}
                    barWidth={barWidth}
                    spacing={spacing}
                    initialSpacing={visualInitialSpacing}
                    endSpacing={visualEndSpacing}
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
                    xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 9, width: xAxisLabelWidth, textAlign: 'center' }}
                    noOfSections={4}
                    maxValue={yAxisMaxValue}
                    overflowTop={64}
                    formatYLabel={formatYAxisLabel}
                    disableScroll={!useScroll}
                    showScrollIndicator={false}
                    isAnimated={true}
                    scrollToEnd={useScroll} 
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        marginVertical: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12
    },
    emptyContainer: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center'
    },
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
