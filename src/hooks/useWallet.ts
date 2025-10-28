import { useState, useEffect } from 'react';
import { walletService, WalletState, WalletAccount } from '../services/walletService';
import { useUser } from '../contexts/UserContext';

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>(walletService.getState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loginWithWallet, logout } = useUser();

  useEffect(() => {
    // 设置登录函数到walletService
    walletService.setLoginWithWalletFunction(loginWithWallet);

    // 监听钱包状态变化
    const handleStateChange = (newState: WalletState) => {
      setWalletState(newState);
    };

    walletService.addListener(handleStateChange);

    // 检查初始连接状态
    walletService.checkConnection();

    return () => {
      walletService.removeListener(handleStateChange);
    };
  }, [loginWithWallet]);

  const connectWallet = async (walletType: string): Promise<WalletAccount | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const account = await walletService.connectWallet(walletType);
      return account;
    } catch (err: any) {
      setError(err.message || '连接钱包失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    // 先退出用户登录
    await logout();
    // 再断开钱包连接
    walletService.disconnect();
    setError(null);
  };

  const switchNetwork = async (chainId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await walletService.switchNetwork(chainId);
      return true;
    } catch (err: any) {
      setError(err.message || '切换网络失败');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signMessage = async (message: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const signature = await walletService.signMessage(message);
      return signature;
    } catch (err: any) {
      setError(err.message || '签名失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTransaction = async (params: {
    to: string;
    value: string;
    data?: string;
  }): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const txHash = await walletService.sendTransaction(params);
      return txHash;
    } catch (err: any) {
      setError(err.message || '交易失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // 状态
    isConnected: walletState.isConnected,
    account: walletState.account,
    chainId: walletState.chainId,
    walletType: walletState.walletType,
    isLoading,
    error,

    // 方法
    connectWallet,
    disconnectWallet,
    switchNetwork,
    signMessage,
    sendTransaction,

    // 工具方法
    isSupportedNetwork: walletService.isSupportedNetwork.bind(walletService),
    getNetworkInfo: walletService.getNetworkInfo.bind(walletService),
  };
};