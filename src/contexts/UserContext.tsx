import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthService } from '../services/authService';
import { useArticleState } from '../hooks/useArticleState';

interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  coverUrl: string;
  faceUrl: string;
  namespace: string;
  walletAddress: string;
  avatar?: string; // Keep for backwards compatibility
}

// Social link type definition
interface SocialLink {
  id: number;
  userId: number;
  title: string;
  linkUrl: string;
  iconUrl: string;
  sortOrder: number;
}

interface UserContextValue {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (userData: User, token?: string) => void;
  loginWithWallet: (walletAddress: string, signature: string, message: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  updateUserNamespace: (namespace: string) => Promise<boolean>;
  getAuthHeaders: () => Record<string, string>;
  fetchUserInfo: (authToken?: string) => Promise<void>;

  // Social links management
  socialLinks: SocialLink[];
  socialLinksLoading: boolean;
  fetchSocialLinks: () => Promise<void>;
  addSocialLink: (linkData: Omit<SocialLink, 'id' | 'userId'>) => Promise<boolean>;
  updateSocialLink: (id: number, linkData: Partial<SocialLink>) => Promise<boolean>;
  deleteSocialLink: (id: number) => Promise<boolean>;

  // Article state management
  articleLikeStates: Record<string, { isLiked: boolean; likeCount: number }>;
  updateArticleLikeState: (articleId: string, isLiked: boolean, likeCount: number) => void;
  getArticleLikeState: (articleId: string, defaultIsLiked: boolean, defaultLikeCount: number) => { isLiked: boolean; likeCount: number };
  toggleLike: (articleId: string, currentIsLiked: boolean, currentLikeCount: number, onOptimisticUpdate?: (isLiked: boolean, likeCount: number) => void) => Promise<{ success: boolean; isLiked: boolean; likeCount: number }>;
  syncArticleStates: (articles: Array<{ id: string; uuid?: string; isLiked: boolean; likeCount: number; }>) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Social links state management
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [socialLinksLoading, setSocialLinksLoading] = useState(false);

  // Use article state management hook
  const { articleLikeStates, updateArticleLikeState, getArticleLikeState, toggleLike, syncArticleStates } = useArticleState();

  // Restore user state from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('copus_user');
    const savedToken = localStorage.getItem('copus_token');

    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('copus_user');
        localStorage.removeItem('copus_token');
      }
    }

    // Initialization complete, set loading to false
    setLoading(false);
  }, []);

  // Sync token and user to localStorage whenever they change in state
  useEffect(() => {
    if (user && token) {
      // Ensure both are saved to localStorage
      const storedToken = localStorage.getItem('copus_token');
      const storedUser = localStorage.getItem('copus_user');

      if (storedToken !== token) {
        console.log('🔄 Syncing token to localStorage');
        localStorage.setItem('copus_token', token);
      }

      if (storedUser !== JSON.stringify(user)) {
        console.log('🔄 Syncing user to localStorage');
        localStorage.setItem('copus_user', JSON.stringify(user));
      }
    }
  }, [user, token]);

  const login = (userData: User, userToken?: string) => {
    setUser(userData);
    localStorage.setItem('copus_user', JSON.stringify(userData));
    if (userToken) {
      setToken(userToken);
      localStorage.setItem('copus_token', userToken);
    }
  };

  // 钱包登录方法 - 使用现有的AuthService
  const loginWithWallet = async (walletAddress: string, signature: string, message: string): Promise<boolean> => {
    try {
      setLoading(true);

      console.log('🔐 开始钱包登录:', {
        walletAddress: walletAddress,
        signature: signature.substring(0, 20) + '...',
        messageLength: message.length
      });

      // 检查是否是开发环境，使用 mock 登录
      const isDevelopment = import.meta.env.VITE_APP_ENV === 'development';

      if (isDevelopment) {
        console.log('🧪 开发环境：使用 Mock 钱包登录');
        return await mockWalletLogin(walletAddress);
      }

      // 生产环境使用真实的AuthService
      const loginResult = await AuthService.metamaskLogin(walletAddress, signature, false);

      console.log('📝 钱包登录API响应:', loginResult);

      if (loginResult && loginResult.token) {
        console.log('✅ 获取到token，开始获取用户信息');

        // 获取用户信息
        await fetchUserInfo(loginResult.token);

        console.log('🎉 钱包登录成功', {
          namespace: loginResult.namespace,
          walletAddress: walletAddress,
        });

        return true;
      } else {
        console.error('❌ 登录失败：未获取到有效token', loginResult);
        return false;
      }
    } catch (error) {
      console.error('❌ 钱包登录异常:', {
        error: error,
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Mock 钱包登录（开发环境使用）
  const mockWalletLogin = async (walletAddress: string): Promise<boolean> => {
    try {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 模拟用户数据
      const mockUser: User = {
        id: Math.floor(Math.random() * 10000),
        username: `User${walletAddress.slice(-6)}`,
        email: '',
        bio: '通过钱包登录的用户',
        coverUrl: '',
        faceUrl: '',
        namespace: `user${walletAddress.slice(-6)}`,
        walletAddress: walletAddress,
        avatar: '',
      };

      const mockToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 设置用户状态
      setUser(mockUser);
      setToken(mockToken);

      // 保存到localStorage
      localStorage.setItem('copus_user', JSON.stringify(mockUser));
      localStorage.setItem('copus_token', mockToken);

      console.log('🎉 Mock 钱包登录成功', {
        username: mockUser.username,
        walletAddress: mockUser.walletAddress,
      });

      return true;
    } catch (error) {
      console.error('Mock 钱包登录失败:', error);
      return false;
    }
  };

  const logout = useCallback(async () => {
    try {
      // Call logout API to notify backend
      await AuthService.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {

      // Clear local state and storage
      setUser(null);
      setToken(null);
      localStorage.removeItem('copus_user');
      localStorage.removeItem('copus_token');
    }
  }, []); // Empty dependencies since it uses setState and localStorage directly

  // Get request headers with authentication
  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('copus_user', JSON.stringify(updatedUser));
    }
  };

  // Update user namespace
  const updateUserNamespace = async (namespace: string): Promise<boolean> => {
    if (!user) {
      return false;
    }

    try {

      const success = await AuthService.updateUserNamespace(namespace);

      if (success) {
        // Update local user state
        const updatedUser = { ...user, namespace };
        setUser(updatedUser);
        localStorage.setItem('copus_user', JSON.stringify(updatedUser));

        return true;
      } else {
        console.error('❌ Namespace update failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Error occurred while updating namespace:', error);
      return false;
    }
  };

  // Token auto-refresh functionality
  const tryRefreshToken = async (): Promise<boolean> => {
    try {
      // Can call token refresh API here
      // const refreshResponse = await AuthService.refreshToken();
      // Return false for now, indicating need to re-login
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  // Get user detailed information
  const fetchUserInfo = useCallback(async (authToken?: string, retryOnFailure: boolean = true) => {
    try {
      // If token is provided, use it; otherwise get from localStorage
      const tokenToUse = authToken || localStorage.getItem('copus_token');

      if (!tokenToUse) {
        console.error('❌ No token available for fetchUserInfo');
        throw new Error('No authentication token available');
      }

      console.log('📥 fetchUserInfo called with token:', tokenToUse.substring(0, 20) + '...');

      const userInfo = await AuthService.getUserInfo(tokenToUse || undefined);

      console.log('✅ Got user info:', userInfo.username);

      // Save user to state and localStorage
      setUser(userInfo);
      localStorage.setItem('copus_user', JSON.stringify(userInfo));

      // IMPORTANT: If a token was provided (like during login), save it to state too!
      if (authToken) {
        console.log('💾 Saving token to state and localStorage');
        setToken(authToken);
        localStorage.setItem('copus_token', authToken);
      }
    } catch (error) {
      console.warn('Failed to get user info (user stays logged in):', error);

      // Don't automatically logout - just throw the error
      // The calling code can decide what to do
      // Users should only be logged out if they manually logout or token is confirmed expired
      throw error;
    }
  }, []); // No dependencies - doesn't call logout anymore

  // Social links management functions
  const fetchSocialLinks = useCallback(async (): Promise<void> => {
    if (!user) {
      return;
    }

    try {
      setSocialLinksLoading(true);
      const response = await AuthService.getUserSocialLinks();

      // Handle API response data
      let linksArray: SocialLink[] = [];
      if (Array.isArray(response)) {
        linksArray = response;
      } else if (response.data && Array.isArray(response.data)) {
        linksArray = response.data;
      }

      setSocialLinks(linksArray);

    } catch (error) {
      console.error('❌ Failed to get social links:', error);
      setSocialLinks([]);
    } finally {
      setSocialLinksLoading(false);
    }
  }, [user]); // Depends on user

  const addSocialLink = async (linkData: Omit<SocialLink, 'id' | 'userId'>): Promise<boolean> => {
    if (!user) return false;

    try {
      const requestData = {
        ...linkData,
        sortOrder: linkData.sortOrder || socialLinks.length
      };

      const response = await AuthService.editSocialLink(requestData);

      // Optimization: directly use response data to update local state
      if (response && response.linkUrl && response.title) {
        const newLink: SocialLink = {
          id: response.id || Date.now(),
          userId: response.userId || user.id,
          title: response.title,
          linkUrl: response.linkUrl,
          iconUrl: response.iconUrl,
          sortOrder: response.sortOrder || socialLinks.length
        };

        setSocialLinks(prev => [...prev, newLink]);
        return true;
      } else {
        // If response data is incomplete, re-fetch
        await fetchSocialLinks();
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to add social link:', error);
      return false;
    }
  };

  const updateSocialLink = async (id: number, linkData: Partial<SocialLink>): Promise<boolean> => {
    if (!user) return false;

    try {

      // Find the link to update
      const existingLink = socialLinks.find(link => link.id === id);
      if (!existingLink) {
        console.error('❌ Social link to update not found');
        return false;
      }

      const requestData = {
        ...existingLink,
        ...linkData
      };

      const response = await AuthService.editSocialLink(requestData);

      // Update local state
      setSocialLinks(prev =>
        prev.map(link =>
          link.id === id ? { ...link, ...linkData } : link
        )
      );

      return true;
    } catch (error) {
      console.error('❌ Failed to update social link:', error);
      return false;
    }
  };

  const deleteSocialLink = async (id: number): Promise<boolean> => {
    if (!user) return false;

    try {

      await AuthService.deleteSocialLink(id);

      // Update local state
      setSocialLinks(prev => prev.filter(link => link.id !== id));

      return true;
    } catch (error) {
      console.error('❌ Failed to delete social link:', error);
      return false;
    }
  };

  // Automatically fetch social links when user logs in
  useEffect(() => {
    if (user) {
      fetchSocialLinks();
    } else {
      setSocialLinks([]);
    }
  }, [user, fetchSocialLinks]);

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!user,
        loading,
        login,
        loginWithWallet,
        logout,
        updateUser,
        updateUserNamespace,
        getAuthHeaders,
        fetchUserInfo,

        // Social links management
        socialLinks,
        socialLinksLoading,
        fetchSocialLinks,
        addSocialLink,
        updateSocialLink,
        deleteSocialLink,

        // Article state management
        articleLikeStates,
        updateArticleLikeState,
        getArticleLikeState,
        toggleLike,
        syncArticleStates
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};