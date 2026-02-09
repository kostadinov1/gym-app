import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getVolumeChart } from '../../api/history';

export const VolumeChart = () => {
    const theme = useTheme();
    const screenWidth = Dimensions.get('window').width;

    const { data, isLoading, error } = useQuery({
        queryKey: ['volumeChart', 'preview'], // Added 'preview' to separate it from the full analytics cache
        // --- FIX IS HERE: Explicitly pass the default period ---
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

    // --- UX LOGIC: Fit vs Scroll ---
    const parentWidth = screenWidth - 32; 
    const barWidth = 22;
    const spacing = 24;
    
    // Fit vs Scroll Logic
    const contentWidth = data.length * (barWidth + spacing);
    const isScrollable = contentWidth > (parentWidth - 40); 

    // Transform data
    const chartData = data.map(item => ({
        value: item.value,
        label: item.label,
        frontColor: theme.colors.primary, 
        topLabelComponent: () => (
            <Text style={{ color: theme.colors.primary, fontSize: 10, marginBottom: 4, fontWeight: 'bold' }}>
                {(item.value / 1000).toFixed(1)}k
            </Text>
        ),
    }));

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Volume Load (Last 3 Months)</Text>
            
            <View style={{ paddingVertical: 10, marginLeft: -10 }}> 
                <BarChart
                    data={chartData}
                    barWidth={barWidth}
                    spacing={spacing}
                    roundedTop
                    roundedBottom
                    hideRules
                    xAxisThickness={0}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
                    noOfSections={3}
                    height={160}
                    width={isScrollable ? undefined : parentWidth}
                    isAnimated={true}
                    scrollToEnd={isScrollable} 
                    initialSpacing={20}
                    endSpacing={20}
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
    }
});