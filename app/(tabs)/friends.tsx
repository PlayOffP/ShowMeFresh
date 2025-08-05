import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Plus, X, MessageSquare, Clock, Search, Bell } from 'lucide-react-native';
import { useAppContext } from '../../src/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getShowById } from '../../utils/showCache';
import { useFriends } from '../../src/hooks/hooks/useFriends';
import { SharedShows } from '../../src/components/SharedShows';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function FriendsScreen() {
  const { 
    friends, 
    sharedShows, 
    addFriend, 
    removeFriend, 
    markSharedShowAsRead,
    getUnreadSharedShows,
    addFriendByUsername,
    searchUserByUsername,
    userProfile,
    user
  } = useAppContext();
  const [addFriendModalVisible, setAddFriendModalVisible] = useState(false);
  const [sharedShowsModalVisible, setSharedShowsModalVisible] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { loading } = useFriends();

  const unreadSharedShows = getUnreadSharedShows();

  const handleSearchUser = async () => {
    if (!newFriendUsername.trim()) return;
    
    setIsSearching(true);
    setSearchResult(null);
    
    try {
      const user = await searchUserByUsername(newFriendUsername.trim());
      setSearchResult(user);
    } catch (error) {
      console.error('Error searching for user:', error);
      Alert.alert('Error', 'Failed to search for user. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async () => {
    if (!searchResult) return;
    
    setIsAddingFriend(true);
    try {
      const success = await addFriendByUsername(searchResult.username);
      if (success) {
        Alert.alert('Success', `Added ${searchResult.username} as a friend!`);
        setNewFriendUsername('');
        setSearchResult(null);
        setAddFriendModalVisible(false);
      } else {
        if (searchResult.email === user?.email) {
          Alert.alert('Cannot Add Yourself', 'You cannot add yourself as a friend.');
        } else {
          Alert.alert('Error', 'Failed to add friend. They might already be your friend.');
        }
      }
    } catch (error) {
      console.error('Error adding friend:', error);
      Alert.alert('Error', 'Failed to add friend. Please try again.');
    } finally {
      setIsAddingFriend(false);
    }
  };

  const handleRemoveFriend = (friendId: string) => {
    removeFriend(friendId);
  };

  const handleMarkAsRead = (sharedShowId: string) => {
    markSharedShowAsRead(sharedShowId);
  };

  const getShowByIdLocal = (showId: string) => {
    return getShowById(showId);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#000000', '#1A1A1A']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
          <View style={styles.headerActions}>
            {unreadSharedShows.length > 0 && (
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => setSharedShowsModalVisible(true)}
              >
                <Bell size={24} color="#FF0050" />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>
                    {unreadSharedShows.length > 9 ? '9+' : unreadSharedShows.length}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setAddFriendModalVisible(true)}
            >
              <Plus size={24} color="#FF0050" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FF0050" style={{ flex: 1 }} />
        ) : (
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Friends List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Friends ({friends.length})</Text>
              {friends.map((friend) => (
                <View key={friend.id} style={styles.friendCard}>
                  <View style={styles.friendInfo}>
                    <View style={styles.friendAvatar}>
                      <User size={20} color="#fff" />
                      {friend.isOnline && <View style={styles.onlineIndicator} />}
                    </View>
                    <View style={styles.friendDetails}>
                      <Text style={styles.friendName}>{friend.name}</Text>
                      <Text style={styles.friendStatus}>
                        {friend.isOnline ? 'Online' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveFriend(friend.id)}
                  >
                    <X size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
              {friends.length === 0 && (
                <View style={styles.emptyState}>
                  <User size={48} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyText}>No friends yet</Text>
                  <Text style={styles.emptySubtext}>
                    Tap the '+' icon to add friends using a share code.
                  </Text>
                </View>
              )}
            </View>

            {/* Shared Shows */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Shared Shows ({sharedShows.length})
                  {unreadSharedShows.length > 0 && (
                    <Text style={styles.unreadBadge}> {unreadSharedShows.length} new</Text>
                  )}
                </Text>
                {sharedShows.length > 0 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => setSharedShowsModalVisible(true)}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {sharedShows.slice(0, 3).map((sharedShow) => {
                const show = getShowByIdLocal(sharedShow.showId);
                const friend = friends.find(f => f.id === sharedShow.sharedBy);
                
                if (!show) return null;

                return (
                  <TouchableOpacity
                    key={sharedShow.id}
                    style={[
                      styles.sharedShowCard,
                      !sharedShow.isRead && styles.unreadCard
                    ]}
                    onPress={() => handleMarkAsRead(sharedShow.id)}
                  >
                    <View style={styles.sharedShowHeader}>
                      <View style={styles.sharedShowInfo}>
                        <Text style={styles.sharedShowTitle}>{show.title}</Text>
                        <Text style={styles.sharedShowMeta}>
                          {show.year} • {show.rating} • {show.duration}
                        </Text>
                      </View>
                      {!sharedShow.isRead && (
                        <View style={styles.unreadIndicator} />
                      )}
                    </View>
                    
                    <View style={styles.sharedShowDetails}>
                      <View style={styles.sharedByRow}>
                        <User size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.sharedByText}>
                          Shared by {friend?.username || friend?.displayName || 'Unknown'}
                        </Text>
                      </View>
                      
                      <View style={styles.timeRow}>
                        <Clock size={14} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.timeText}>
                          {formatTimeAgo(sharedShow.createdAt)}
                        </Text>
                      </View>
                    </View>

                    {sharedShow.message && (
                      <Text style={styles.sharedMessage} numberOfLines={2}>
                        "{sharedShow.message}"
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
              
              {sharedShows.length === 0 && (
                <View style={styles.emptySharedShows}>
                  <MessageSquare size={32} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptySharedText}>No shared shows yet</Text>
                  <Text style={styles.emptySharedSubtext}>
                    When friends share shows with you, they'll appear here
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Add Friend Modal */}
        <Modal
          visible={addFriendModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddFriendModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modal}>
              <LinearGradient
                colors={['#1A1A1A', '#2A2A2A']}
                style={styles.modalGradient}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Friend</Text>
                  <TouchableOpacity
                    onPress={() => setAddFriendModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <X size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalContent}>
                  <Text style={styles.modalLabel}>Friend's Username</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter friend's username"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={newFriendUsername}
                    onChangeText={setNewFriendUsername}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  
                  {/* Search Results */}
                  {isSearching && (
                    <View style={styles.searchResult}>
                      <ActivityIndicator size="small" color="#FF0050" />
                      <Text style={styles.searchResultText}>Searching...</Text>
                    </View>
                  )}
                  
                  {searchResult && !isSearching && (
                    <View style={styles.searchResult}>
                      <View style={styles.userInfo}>
                        <View style={styles.userAvatar}>
                          <User size={20} color="#fff" />
                        </View>
                        <View style={styles.userDetails}>
                          <Text style={styles.userUsername}>@{searchResult.username}</Text>
                          <Text style={styles.userEmail}>{searchResult.email}</Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        style={[
                          styles.addFriendButton,
                          isAddingFriend && styles.addFriendButtonDisabled
                        ]}
                        onPress={handleAddFriend}
                        disabled={isAddingFriend}
                      >
                        {isAddingFriend ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.addFriendButtonText}>Add Friend</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {searchResult === null && !isSearching && newFriendUsername.trim() && (
                    <View style={styles.searchResult}>
                      <Text style={styles.searchResultText}>User not found</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    !newFriendUsername.trim() && styles.modalButtonDisabled
                  ]}
                  onPress={handleSearchUser}
                  disabled={!newFriendUsername.trim() || isSearching}
                >
                  <Text style={styles.modalButtonText}>
                    {isSearching ? 'Searching...' : 'Search'}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        {/* Shared Shows Modal */}
        <Modal
          visible={sharedShowsModalVisible}
          animationType="slide"
          onRequestClose={() => setSharedShowsModalVisible(false)}
        >
          <SharedShows
            visible={sharedShowsModalVisible}
            onClose={() => setSharedShowsModalVisible(false)}
          />
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 8,
  },
  notificationBadge: {
    backgroundColor: '#FF0050',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 4,
  },
  notificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,0,80,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: 'Inter-Bold',
  },
  unreadBadge: {
    color: '#FF0050',
    fontSize: 16,
    fontWeight: '600',
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: 'Inter-SemiBold',
  },
  friendStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  removeButton: {
    padding: 8,
  },
  sharedShowCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  unreadCard: {
    backgroundColor: 'rgba(255,0,80,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,0,80,0.3)',
  },
  sharedShowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sharedShowInfo: {
    flex: 1,
  },
  sharedShowTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  sharedShowMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0050',
  },
  sharedShowMessage: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
  },
  sharedShowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharedShowGenres: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  sharedShowYear: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    marginBottom: 24,
  },
  modalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  modalButton: {
    backgroundColor: '#FF0050',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  searchResultText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: 'Inter-SemiBold',
  },
  userEmail: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  addFriendButton: {
    backgroundColor: '#FF0050',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addFriendButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  addFriendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sharedShowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sharedByText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  sharedMessage: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  emptySharedShows: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySharedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  emptySharedSubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0050',
    marginLeft: 8,
  },
}); 