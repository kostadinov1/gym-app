import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme'; // Import the hook
import { getExercises, createExercise } from '../api/exercises';

export default function ExerciseListScreen() {
  const theme = useTheme(); // Call hook INSIDE the component
  const [isModalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [increment, setIncrement] = useState('2.5');

  // Queries
  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
  });

  const mutation = useMutation({
    mutationFn: createExercise,
    onSuccess: () => {
      setModalVisible(false);
      setName('');
      refetch();
    },
    onError: (err) => Alert.alert("Error", (err as Error).message)
  });

  const handleSave = () => {
    if (!name) return;
    mutation.mutate({
      name,
      default_increment: parseFloat(increment),
      unit: 'kg'
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Unable to load exercises</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.header, { color: theme.colors.text }]}>My Exercises</Text>
      
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }} // Space for FAB
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.name}</Text>
              {item.is_custom && <View style={[styles.badge, { backgroundColor: theme.colors.primary }]} />}
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
              Next increment: +{item.default_increment} {item.unit}
            </Text>
          </View>
        )}
      />

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.colors.primary }]} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalHeader, { color: theme.colors.text }]}>New Exercise</Text>
            
            <TextInput 
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Name"
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
            
            <TextInput 
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Increment"
              placeholderTextColor={theme.colors.textSecondary}
              value={increment}
              onChangeText={setIncrement}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave}>
                <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Static Styles (We inject colors via inline styles above where needed)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 14,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabText: {
    color: 'white',
    fontSize: 32,
    marginTop: -4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
});