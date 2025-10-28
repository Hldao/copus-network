import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { useWallet } from '../../hooks/useWallet';
import { Button } from './button';

export const UserStatusBar: React.FC = () => {
  const { user, isLoggedIn, logout } = useUser();
  const { isConnected, account, disconnect } = useWallet();

  if (!isConnected || !isLoggedIn) {
    return null;
  }

  const handleDisconnect = () => {
    disconnect();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* 用户头像 */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {user?.nickname ? user.nickname.charAt(0).toUpperCase() : '👤'}
            </span>
          </div>

          {/* 用户信息 */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">
                {user?.nickname || '未设置昵称'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                已连接
              </span>
            </div>
            <div className="text-sm text-gray-500">
              钱包地址: {account?.address ? formatAddress(account.address) : ''}
            </div>
            {account?.balance && (
              <div className="text-sm text-gray-500">
                余额: {account.balance} ETH
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            断开连接
          </Button>
        </div>
      </div>

      {/* 用户ID和创建时间 */}
      {user && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>用户ID: {user.id}</span>
            <span>
              注册时间: {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStatusBar;