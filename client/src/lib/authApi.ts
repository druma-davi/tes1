import { User } from "@shared/schema";

// Get the currently logged in user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/user', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error('Failed to fetch user');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

// Logout the current user
export async function logoutUser(): Promise<void> {
  const response = await fetch('/api/logout', {
    method: 'GET',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Logout failed');
  }
}

// Update user profile
export async function updateUserProfile(userId: number, data: { name?: string; bio?: string; avatar?: string }): Promise<User> {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }
  
  return response.json();
}

// Delete user account
export async function deleteUserAccount(userId: number): Promise<void> {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete account');
  }
}

// Follow a user
export async function followUser(userId: number): Promise<any> {
  const response = await fetch(`/api/users/${userId}/follow`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to follow user');
  }
  
  return response.json();
}

// Unfollow a user
export async function unfollowUser(userId: number): Promise<void> {
  const response = await fetch(`/api/users/${userId}/follow`, {
    method: 'DELETE',
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to unfollow user');
  }
}
