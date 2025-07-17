import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../src/context/AppContext';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { testFirebaseConnection, interpretConnectionError, ConnectionTestResult } from '../src/utils/testFirebaseConnection';

const STORAGE_EVENTS = 'user_interactions';

export default function TestDataCollection() {
  const { user, userProfile, logInteraction, savedShows } = useAppContext();
  const [localData, setLocalData] = useState<any[]>([]);
  const [firestoreData, setFirestoreData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Load local interaction data
  const loadLocalData = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_EVENTS);
      const events = raw ? JSON.parse(raw) : [];
      setLocalData(events.slice(-10)); // Show last 10 events
      console.log('Local interactions found:', events.length);
    } catch (error) {
      console.error('Error loading local data:', error);
    }
  };

  // Load Firestore interaction data
  const loadFirestoreData = async () => {
    if (!user) {
      setFirestoreData([]);
      return;
    }

    setLoading(true);
    try {
      const interactionsRef = collection(db, 'users', user.uid, 'interactions');
      const q = query(
        interactionsRef,
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      const interactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setFirestoreData(interactions);
      console.log('Firestore interactions found:', interactions.length);
    } catch (error: any) {
      console.error('Error loading Firestore data:', error);
      Alert.alert('Firestore Error', `${error.message}\n\nThis might be the source of your WebChannelConnection warning.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocalData();
    loadFirestoreData();
  }, [user]);

  const clearLocalData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_EVENTS);
      setLocalData([]);
      Alert.alert('Success', 'Local interaction data cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear local data');
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const runConnectionTest = async () => {
    setTestingConnection(true);
    try {
      const result = await testFirebaseConnection();
      setConnectionTest(result);
      
      if (result.success) {
        Alert.alert('✅ Connection Test Passed', 'Firebase is working correctly!');
      } else {
        Alert.alert(
          '❌ Connection Test Failed', 
          `${result.error}\n\nSuggestion: ${interpretConnectionError(result.error || '')}`
        );
      }
    } catch (error: any) {
      Alert.alert('❌ Test Error', error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const simulateInteraction = async () => {
    if (!user) {
      Alert.alert('Not Authenticated', 'Please sign in to test data collection');
      return;
    }

    try {
      // Simulate a user interaction
      await logInteraction({
        type: 'skip',
        showId: 'test-show-' + Date.now(),
        metadata: {
          genre: 'Comedy',
          runtime: 30,
          watchTime: 5
        }
      });
      
      Alert.alert('✅ Test Interaction Created', 'Check the data sections below to see the new interaction');
      
      // Refresh data
      await Promise.all([loadLocalData(), loadFirestoreData()]);
    } catch (error: any) {
      Alert.alert('❌ Test Failed', error.message);
    }
  };

  const clearRecentlyRecommended = async () => {
    if (!user) {
      Alert.alert('Not Authenticated', 'Please sign in first');
      return;
    }

    try {
      await AsyncStorage.removeItem(`recentlyRecommended_${user.uid}`);
      Alert.alert('✅ Success', 'Recently recommended shows cleared! Go back to For You tab to see fresh recommendations.');
    } catch (error: any) {
      Alert.alert('❌ Error', 'Failed to clear: ' + error.message);
    }
  };

  const viewCacheInfo = () => {
    // Import the cache map to inspect it
    import('../utils/showCache').then(({ getShowById }) => {
      // Get some cache stats
      const savedShowsInfo = savedShows.map(id => ({
        id,
        found: !!getShowById(id),
        title: getShowById(id)?.title || 'Not found'
      }));
      
      const cacheInfo = `Cache Status for Saved Shows:\n\n${savedShowsInfo.map(info => 
        `${info.found ? '✅' : '❌'} ${info.id}: ${info.title}`
      ).join('\n')}`;
      
      Alert.alert('Show Cache Info', cacheInfo);
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Data Collection Debug</Text>
      
      {/* User Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Status</Text>
        <Text style={styles.text}>Authenticated: {user ? '✅ Yes' : '❌ No'}</Text>
        {user && <Text style={styles.text}>User ID: {user.uid}</Text>}
        <Text style={styles.text}>Profile: {userProfile ? '✅ Set' : '❌ Not set'}</Text>
      </View>

      {/* Data Collection Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Collection Summary</Text>
        <Text style={[styles.text, { color: firestoreData.length > 0 ? '#4CAF50' : '#FFA726' }]}>
          {firestoreData.length > 0 ? '✅ Data Collection Working!' : '⚠️ No data collected yet'}
        </Text>
        <Text style={styles.text}>Local Storage: {localData.length} interactions</Text>
        <Text style={styles.text}>Firebase Storage: {firestoreData.length} interactions</Text>
        {firestoreData.length > 0 && (
          <Text style={[styles.text, { color: '#4CAF50', marginTop: 10 }]}>
            🎉 Your app IS collecting user interaction data! The algorithm can use this data to improve recommendations.
          </Text>
        )}
        {user && firestoreData.length === 0 && (
          <Text style={[styles.text, { color: '#FFA726', marginTop: 10 }]}>
            💡 Try using the app (swipe videos, save shows, rate content) to generate data, then refresh this screen.
          </Text>
        )}
      </View>

      {/* User Profile */}
      {userProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Profile</Text>
          <Text style={styles.text}>Genres: {userProfile.genres.join(', ')}</Text>
          <Text style={styles.text}>Runtime: {userProfile.runtime}</Text>
          <Text style={styles.text}>Language: {userProfile.language}</Text>
          <Text style={styles.text}>Genre Weights: {Object.keys(userProfile.genreWeights).length} genres tracked</Text>
        </View>
      )}

      {/* Firebase Connection Test */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Firebase Connection Test</Text>
        {connectionTest ? (
          <View>
            <Text style={[styles.text, { color: connectionTest.success ? '#4CAF50' : '#F44336' }]}>
              Overall Status: {connectionTest.success ? '✅ Working' : '❌ Failed'}
            </Text>
            <Text style={styles.text}>Auth: {connectionTest.details.authWorking ? '✅' : '❌'}</Text>
            <Text style={styles.text}>Firestore Read: {connectionTest.details.firestoreReadWorking ? '✅' : '❌'}</Text>
            <Text style={styles.text}>Firestore Write: {connectionTest.details.firestoreWriteWorking ? '✅' : '❌'}</Text>
            {connectionTest.error && (
              <Text style={[styles.text, { color: '#F44336', marginTop: 10 }]}>
                Error: {connectionTest.error}
              </Text>
            )}
            {connectionTest.error && (
              <Text style={[styles.text, { color: '#FFA726', marginTop: 5 }]}>
                Suggestion: {interpretConnectionError(connectionTest.error)}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.text}>No test run yet</Text>
        )}
        <Pressable 
          style={[styles.button, { backgroundColor: testingConnection ? '#666' : '#FF9800' }]} 
          onPress={runConnectionTest}
          disabled={testingConnection}
        >
          <Text style={styles.buttonText}>
            {testingConnection ? 'Testing...' : 'Test Firebase Connection'}
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.button, { backgroundColor: '#4CAF50', marginTop: 10 }]} 
          onPress={simulateInteraction}
        >
          <Text style={styles.buttonText}>Create Test Interaction</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, { backgroundColor: '#9C27B0', marginTop: 10 }]} 
          onPress={clearRecentlyRecommended}
        >
          <Text style={styles.buttonText}>Clear Recently Recommended</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, { backgroundColor: '#FF9800', marginTop: 10 }]} 
          onPress={viewCacheInfo}
        >
          <Text style={styles.buttonText}>View Cache Info</Text>
        </Pressable>
      </View>

      {/* Local Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local Interactions ({localData.length})</Text>
        {localData.length === 0 ? (
          <Text style={styles.text}>No local interactions found</Text>
        ) : (
          localData.map((interaction, index) => (
            <View key={index} style={styles.interaction}>
              <Text style={styles.interactionType}>{interaction.type.toUpperCase()}</Text>
              <Text style={styles.text}>Show: {interaction.showId}</Text>
              <Text style={styles.text}>Time: {formatTimestamp(interaction.timestamp)}</Text>
              {interaction.metadata && (
                <Text style={styles.text}>
                  Metadata: {JSON.stringify(interaction.metadata, null, 2)}
                </Text>
              )}
            </View>
          ))
        )}
        <Pressable style={styles.button} onPress={clearLocalData}>
          <Text style={styles.buttonText}>Clear Local Data</Text>
        </Pressable>
      </View>

      {/* Firestore Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Firestore Interactions ({firestoreData.length}) {loading && '(Loading...)'}
        </Text>
        {!user ? (
          <Text style={styles.text}>Sign in to see Firestore data</Text>
        ) : firestoreData.length === 0 ? (
          <Text style={styles.text}>No Firestore interactions found</Text>
        ) : (
          firestoreData.map((interaction, index) => (
            <View key={index} style={styles.interaction}>
              <Text style={styles.interactionType}>{interaction.type.toUpperCase()}</Text>
              <Text style={styles.text}>Show: {interaction.showId}</Text>
              <Text style={styles.text}>Time: {formatTimestamp(interaction.timestamp)}</Text>
              <Text style={styles.text}>User: {interaction.userId}</Text>
              {interaction.metadata && (
                <Text style={styles.text}>
                  Metadata: {JSON.stringify(interaction.metadata, null, 2)}
                </Text>
              )}
            </View>
          ))
        )}
        <Pressable style={styles.button} onPress={loadFirestoreData}>
          <Text style={styles.buttonText}>Refresh Firestore Data</Text>
        </Pressable>
      </View>

      {/* Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Generate Data</Text>
        <Text style={styles.text}>1. Go to the "For You" tab</Text>
        <Text style={styles.text}>2. Swipe through videos (generates 'skip' events)</Text>
        <Text style={styles.text}>3. Save shows to Must Watch (generates 'save' events)</Text>
        <Text style={styles.text}>4. Rate shows (generates 'rate' events)</Text>
        <Text style={styles.text}>5. Watch videos (generates 'watch' events with watch time)</Text>
        <Text style={styles.text}>6. Come back here to see the collected data</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#111',
    borderRadius: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  text: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 5,
  },
  interaction: {
    backgroundColor: '#222',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  interactionType: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
}); 