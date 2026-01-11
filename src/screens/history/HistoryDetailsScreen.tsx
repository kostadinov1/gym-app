import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { getSessionDetails } from '../../api/history';
import { Container } from '../../components/common/Container';

export default function HistoryDetailsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { sessionId } = route.params;

  const { data, isLoading } = useQuery({
    queryKey: ['sessionDetails', sessionId],
    queryFn: () => getSessionDetails(sessionId),
  });

  if (isLoading || !data) {
    return (
        <Container style={{ justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.primary} />
        </Container>
    );
  }

  // Group sets by Exercise Name for cleaner UI
  const groupedSets = data.sets.reduce((acc: any, set) => {
    if (!acc[set.exercise_name]) {
        acc[set.exercise_name] = [];
    }
    acc[set.exercise_name].push(set);
    return acc;
  }, {});

  const exerciseNames = Object.keys(groupedSets);

  return (
    <Container isScrollable={true}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{data.routine_name}</Text>
        <Text style={{ color: theme.colors.textSecondary }}>
            {new Date(data.start_time).toLocaleDateString()} • {data.duration_minutes} min
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        {exerciseNames.map((name) => (
            <View key={name} style={[styles.card, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.exerciseTitle, { color: theme.colors.text }]}>{name}</Text>
                
                {groupedSets[name].map((set: any, index: number) => (
                    <View key={index} style={[styles.setRow, { borderBottomColor: theme.colors.border }]}>
                        <View style={styles.setBadge}>
                            <Text style={{ fontWeight: 'bold', color: theme.colors.textSecondary }}>{set.set_number}</Text>
                        </View>
                        <Text style={{ color: theme.colors.text, fontSize: 16 }}>
                            {set.weight}kg x {set.reps}
                        </Text>
                    </View>
                ))}
            </View>
        ))}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 24, fontWeight: 'bold' },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  exerciseTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  setBadge: { 
      width: 24, height: 24, borderRadius: 12, backgroundColor: '#eee', 
      justifyContent: 'center', alignItems: 'center', marginRight: 12 
  }
});