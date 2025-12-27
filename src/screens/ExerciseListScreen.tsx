import React, { useState } from 'react';
import { 
  StyleSheet, View, Text, FlatList, ActivityIndicator, 
  TouchableOpacity, Modal, TextInput, Alert 
} from 'react-native';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { theme } from './src/theme';
import { getExercises, createExercise } from './src/api/exercises'; // Import from new file

// ... (Client setup remains)

function ExerciseListScreen() {
  const [isModalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [increment, setIncrement] = useState('2.5');

  // 1. Fetch Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
  });

  // 2. Mutation (The POST request)
  const mutation = useMutation({
    mutationFn: createExercise,
    onSuccess: () => {
      // Close modal, clear form, and refresh list
      setModalVisible(false);
      setName('');
      refetch(); // Reloads the list from backend!
    },
    onError: (error) => {
      Alert.alert("Error", (error as Error).message);
    }
  });

  const handleSave = () => {
    if (!name) return;
    mutation.mutate({
      name,
      default_increment: parseFloat(increment),
      unit: 'kg' // hardcoded for now
    });
  };

  if (isLoading) return <ActivityIndicator size="large" style={styles.center} />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Gym Progress</Text>
      
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>+{item.default_increment} {item.unit}</Text>
          </View>
        )}
      />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Exercise Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>New Exercise</Text>
            
            <TextInput 
              style={styles.input}
              placeholder="Exercise Name (e.g. Squat)"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            
            <TextInput 
              style={styles.input}
              placeholder="Increment (e.g. 2.5)"
              value={increment}
              onChangeText={setIncrement}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSave}
                disabled={mutation.isPending}
              >
                <Text style={styles.saveText}>
                  {mutation.isPending ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ... (App export remains the same)

// ADD THESE STYLES
const styles = StyleSheet.create({
  // ... existing styles ...
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: theme.colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabText: {
    color: 'white',
    fontSize: 32,
    marginTop: -4, // visual adjustment
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
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
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  }
});