import React from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { useWallet } from '../../hooks/useWallet';

export interface WalletStatusProps {
  showBalance?: boolean;
  showNetwork?: boolean;
  onConnect?: () => void;
}

export const WalletStatus: React.FC<WalletStatusProps> = ({
  showBalance = true,
  showNetwork = true,
  onConnect
}) => {
  const {
    isConnected,
    account,
    chainId,
    walletType,
    isLoading,
    disconnectWallet,
    getNetworkInfo
  } = useWallet();

  // 获取网络信息
  const networkInfo = chainId ? getNetworkInfo(chainId) : null;

  // 处理连接按钮点击
  const handleConnect = () => {
    if (onConnect) {
      onConnect();
    }
  };

  // 处理断开连接
  const handleDisconnect = () => {
    disconnectWallet();
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-600">连接中...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleConnect}
        className="text-sm"
      >
        🔗 连接钱包
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {/* 钱包类型指示器 */}
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-gray-700 capitalize">
          {walletType}
        </span>
      </div>

      {/* 网络信息 */}
      {showNetwork && networkInfo && (
        <Badge variant="outline" className="text-xs">
          {networkInfo.nativeCurrency.symbol}
        </Badge>
      )}

      {/* 账户信息 */}
      {account && (
        <div className="flex items-center space-x-2">
          <span className="text-sm font-mono text-gray-600">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>

          {/* 余额显示 */}
          {showBalance && account.balance && networkInfo && (
            <span className="text-sm text-gray-500">
              {account.balance} {networkInfo.nativeCurrency.symbol}
            </span>
          )}
        </div>
      )}

      {/* 断开连接按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDisconnect}
        className="text-xs text-gray-500 hover:text-red-600"
        title="断开连接"
      >
        ⚡
      </Button>
    </div>
  );
};